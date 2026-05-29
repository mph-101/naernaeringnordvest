"""
Daily job-change detector for Møre og Romsdal (fylke 15).

Fetches leader/board roles from Brønnøysund for all AS/ASA companies in the
county, stores a daily snapshot, diffs against the previous day, and inserts
each detected change into the job_changes table as a pending editorial tip.

Environment variables (set via GitHub Secrets):
  SUPABASE_URL            – project URL
  SUPABASE_SERVICE_ROLE_KEY – service role key (bypasses RLS)
"""

from __future__ import annotations

import os
import sys
import time
import json
import logging
from datetime import date, timedelta

import httpx
from supabase import create_client, Client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("jobbytte")

BRREG_BASE = "https://data.brreg.no/enhetsregisteret/api"
FYLKE = "15"
ORG_FORMS = "AS,ASA,SA"
PAGE_SIZE = 100
THROTTLE_S = 0.2
ROLE_TYPES_OF_INTEREST = {"DAGL", "STYR", "LEDE", "NEST"}


def get_supabase() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


# ── Brreg helpers ──────────────────────────────────────────────────────────


def fetch_companies_in_fylke() -> list[dict]:
    """Return all AS/ASA/SA companies in Møre og Romsdal via Brreg search."""
    companies: list[dict] = []
    page = 0
    with httpx.Client(timeout=30) as client:
        while True:
            resp = client.get(
                f"{BRREG_BASE}/enheter",
                params={
                    "fylkesnummer": FYLKE,
                    "organisasjonsform": ORG_FORMS,
                    "size": PAGE_SIZE,
                    "page": page,
                },
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()
            embedded = data.get("_embedded", {})
            enheter = embedded.get("enheter", [])
            if not enheter:
                break
            for e in enheter:
                companies.append(
                    {
                        "orgnr": e["organisasjonsnummer"],
                        "navn": e.get("navn", ""),
                    }
                )
            page_info = data.get("page", {})
            total_pages = page_info.get("totalPages", 1)
            page += 1
            if page >= total_pages:
                break
            time.sleep(THROTTLE_S)
    log.info("Fetched %d companies from Brreg for fylke %s", len(companies), FYLKE)
    return companies


def fetch_roles(orgnr: str, client: httpx.Client) -> list[dict]:
    """Fetch current roles for a single company."""
    resp = client.get(
        f"{BRREG_BASE}/enheter/{orgnr}/roller",
        headers={"Accept": "application/json"},
    )
    if resp.status_code == 404:
        return []
    resp.raise_for_status()
    data = resp.json()
    roles = []
    for g in data.get("rollegrupper", []):
        kode = g.get("type", {}).get("kode", "")
        beskrivelse = g.get("type", {}).get("beskrivelse", "")
        for r in g.get("roller", []):
            person = None
            p = r.get("person")
            if p:
                fornavn = p.get("fornavn") or (p.get("navn") or {}).get("fornavn", "")
                etternavn = p.get("etternavn") or (p.get("navn") or {}).get("etternavn", "")
                if fornavn or etternavn:
                    person = {"fornavn": fornavn, "etternavn": etternavn}
            enhet = None
            e = r.get("enhet")
            if e:
                enhet = {
                    "orgnr": e.get("organisasjonsnummer", ""),
                    "navn": e.get("navn", [e.get("navn", "")])[0]
                    if isinstance(e.get("navn"), list)
                    else e.get("navn", ""),
                }
            roles.append(
                {
                    "type": kode,
                    "typeBeskrivelse": beskrivelse,
                    "person": person,
                    "enhet": enhet,
                    "fratradt": r.get("fratradt", False),
                }
            )
    return roles


# ── Snapshot & diff ────────────────────────────────────────────────────────


def role_key(r: dict) -> str:
    person_key = f"{(r.get('person') or {}).get('fornavn', '')}|{(r.get('person') or {}).get('etternavn', '')}"
    enhet_key = f"enhet:{(r.get('enhet') or {}).get('orgnr', '')}" if r.get("enhet") else ""
    fratradt = "F" if r.get("fratradt") else ""
    return f"{r.get('type', '')}::{person_key}::{enhet_key}::{fratradt}"


def diff_roles(old: list[dict], new: list[dict]) -> tuple[list[dict], list[dict]]:
    old_keys = {role_key(r) for r in old}
    new_keys = {role_key(r) for r in new}
    added = [r for r in new if role_key(r) not in old_keys]
    removed = [r for r in old if role_key(r) not in new_keys]
    return added, removed


def person_name(r: dict) -> str:
    p = r.get("person") or {}
    return f"{p.get('fornavn', '')} {p.get('etternavn', '')}".strip()


def store_snapshot(sb: Client, orgnr: str, roles: list[dict], today: date) -> None:
    sb.table("company_roles_snapshots").upsert(
        {
            "orgnr": orgnr,
            "snapshot_date": today.isoformat(),
            "roles": roles,
            "fetched_at": "now()",
        },
        on_conflict="orgnr,snapshot_date",
    ).execute()


def get_snapshot(sb: Client, orgnr: str, d: date) -> list[dict] | None:
    resp = (
        sb.table("company_roles_snapshots")
        .select("roles")
        .eq("orgnr", orgnr)
        .eq("snapshot_date", d.isoformat())
        .maybe_single()
        .execute()
    )
    if resp.data:
        return resp.data["roles"]
    return None


def insert_job_change(
    sb: Client,
    *,
    person: str,
    change_type: str,
    old_role: str | None,
    new_role: str | None,
    old_company: str | None,
    new_company: str | None,
    orgnr: str,
    source_text: str,
) -> None:
    brreg_url = f"https://data.brreg.no/enhetsregisteret/oppslag/enheter/{orgnr}"
    sb.table("job_changes").insert(
        {
            "person_name": person,
            "change_type": change_type,
            "old_role": old_role,
            "new_role": new_role,
            "old_company": old_company,
            "new_company": new_company,
            "source_url": brreg_url,
            "source_text": source_text,
            "submitted_by": None,
            "image_url": None,
            "photo_credit": None,
            "generated_notice": None,
        }
    ).execute()


# ── Main ───────────────────────────────────────────────────────────────────


def main() -> None:
    sb = get_supabase()
    today = date.today()
    yesterday = today - timedelta(days=1)

    companies = fetch_companies_in_fylke()
    if not companies:
        log.warning("No companies found — exiting")
        return

    tips_created = 0
    errors = 0

    with httpx.Client(timeout=30) as http:
        for i, comp in enumerate(companies):
            orgnr = comp["orgnr"]
            navn = comp["navn"]
            try:
                roles = fetch_roles(orgnr, http)
                store_snapshot(sb, orgnr, roles, today)

                old_roles = get_snapshot(sb, orgnr, yesterday)
                if old_roles is None:
                    # No previous snapshot — baseline only
                    if i % 500 == 0:
                        log.info("Progress: %d/%d (baseline for %s)", i, len(companies), orgnr)
                    time.sleep(THROTTLE_S)
                    continue

                added, removed = diff_roles(old_roles, roles)

                interesting_added = [r for r in added if r.get("type") in ROLE_TYPES_OF_INTEREST and not r.get("fratradt")]
                interesting_removed = [r for r in removed if r.get("type") in ROLE_TYPES_OF_INTEREST]

                for r in interesting_added:
                    name = person_name(r)
                    if not name:
                        continue
                    matching_removed = [
                        rem for rem in interesting_removed
                        if rem.get("type") == r.get("type") and person_name(rem) != name
                    ]
                    source = (
                        f"Automatisk oppdaget fra Foretaksregisteret {today.isoformat()}. "
                        f"{name} registrert som ny {r.get('typeBeskrivelse', r.get('type', ''))} i {navn} (orgnr {orgnr})."
                    )
                    insert_job_change(
                        sb,
                        person=name,
                        change_type="job_change",
                        old_role=None,
                        new_role=r.get("typeBeskrivelse", r.get("type", "")),
                        old_company=None,
                        new_company=navn,
                        orgnr=orgnr,
                        source_text=source,
                    )
                    tips_created += 1
                    log.info("TIP: %s → ny %s i %s", name, r.get("typeBeskrivelse"), navn)

                for r in interesting_removed:
                    name = person_name(r)
                    if not name:
                        continue
                    already_added = any(
                        person_name(a) == name and a.get("type") == r.get("type")
                        for a in interesting_added
                    )
                    if already_added:
                        continue
                    fratradt = r.get("fratradt", False)
                    source = (
                        f"Automatisk oppdaget fra Foretaksregisteret {today.isoformat()}. "
                        f"{name} er {'fratrådt' if fratradt else 'fjernet'} som "
                        f"{r.get('typeBeskrivelse', r.get('type', ''))} i {navn} (orgnr {orgnr})."
                    )
                    insert_job_change(
                        sb,
                        person=name,
                        change_type="job_change",
                        old_role=r.get("typeBeskrivelse", r.get("type", "")),
                        new_role=None,
                        old_company=navn,
                        new_company=None,
                        orgnr=orgnr,
                        source_text=source,
                    )
                    tips_created += 1
                    log.info("TIP: %s fratrådt %s i %s", name, r.get("typeBeskrivelse"), navn)

            except Exception:
                errors += 1
                log.exception("Error processing %s (%s)", orgnr, navn)

            if i % 500 == 0 and i > 0:
                log.info("Progress: %d/%d companies, %d tips so far", i, len(companies), tips_created)
            time.sleep(THROTTLE_S)

    log.info(
        "Done. Companies: %d, tips created: %d, errors: %d",
        len(companies),
        tips_created,
        errors,
    )


if __name__ == "__main__":
    main()
