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
from datetime import date, datetime, timedelta, timezone

import httpx
from supabase import create_client, Client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("jobbytte")

BRREG_BASE = "https://data.brreg.no/enhetsregisteret/api"
# Brreg has no fylke filter on the search endpoint, so we filter by kommunenummer.
# Møre og Romsdal = every kommune whose number starts with "15". We resolve the
# list dynamically from /kommuner so it survives kommune reforms.
FYLKE_PREFIX = "15"
ORG_FORMS = "AS,ASA,SA"
PAGE_SIZE = 100
# Brreg caps deep pagination at page*size <= 10000, so we paginate per kommune
# (largest kommune is well under 10k AS/ASA/SA) instead of one county-wide query.
PAGINATION_CAP = 10000
THROTTLE_S = 0.2
ROLE_TYPES_OF_INTEREST = {"DAGL", "STYR", "LEDE", "NEST"}

# How the run behaves, set via the JOBBYTTE_MODE env var:
#   "incremental" (default) – diff only companies that the national Brreg
#                             updates feed flags as changed since last run.
#   "full"                  – list every AS/ASA/SA in the county, refresh the
#                             fylke15_companies membership set, diff all. Acts
#                             as the weekly safety net.
MODE = os.environ.get("JOBBYTTE_MODE", "incremental").strip().lower()
FEED_PAGE_SIZE = 1000
CURSOR_KEY = "last_oppdateringsid"
# When no cursor exists yet, look this many days back in the updates feed.
INITIAL_LOOKBACK_DAYS = 2
# Full mode sweeps ~19.8k companies (1 Brreg call each), so a tighter throttle
# is still polite (~10 req/s) and roughly halves the per-company cost.
FULL_THROTTLE_S = 0.1
# Snapshot writes are batched in the full run to avoid a DB round trip per
# company (that per-company round trip is what timed the first full run out).
SNAPSHOT_BATCH = 500


def get_supabase() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


# ── Brreg helpers ──────────────────────────────────────────────────────────


def fetch_kommuner_in_fylke(client: httpx.Client) -> list[str]:
    """Return all kommunenummer in Møre og Romsdal (prefix "15")."""
    resp = client.get(
        f"{BRREG_BASE}/kommuner",
        params={"size": 1000},
        headers={"Accept": "application/json"},
    )
    resp.raise_for_status()
    kommuner = resp.json().get("_embedded", {}).get("kommuner", [])
    numbers = sorted(
        k["nummer"] for k in kommuner if str(k.get("nummer", "")).startswith(FYLKE_PREFIX)
    )
    log.info("Resolved %d kommuner in fylke %s", len(numbers), FYLKE_PREFIX)
    return numbers


def fetch_companies_in_kommune(kommunenr: str, client: httpx.Client) -> list[dict]:
    """Return all AS/ASA/SA companies in a single kommune via Brreg search."""
    companies: list[dict] = []
    page = 0
    while True:
        resp = client.get(
            f"{BRREG_BASE}/enheter",
            params={
                "kommunenummer": kommunenr,
                "organisasjonsform": ORG_FORMS,
                "size": PAGE_SIZE,
                "page": page,
            },
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
        enheter = data.get("_embedded", {}).get("enheter", [])
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
        # Defensive: never cross Brreg's deep-pagination cap (shouldn't happen
        # per kommune, but guards against a kommune growing past the limit).
        if page >= total_pages or page * PAGE_SIZE >= PAGINATION_CAP:
            break
        time.sleep(THROTTLE_S)
    return companies


def fetch_companies_in_fylke(client: httpx.Client) -> list[dict]:
    """Return all AS/ASA/SA companies in Møre og Romsdal, kommune by kommune."""
    companies: list[dict] = []
    for kommunenr in fetch_kommuner_in_fylke(client):
        kommune_companies = fetch_companies_in_kommune(kommunenr, client)
        companies.extend(kommune_companies)
        log.info("Kommune %s: %d companies (running total %d)", kommunenr, len(kommune_companies), len(companies))
        time.sleep(THROTTLE_S)

    # Brreg pagination can surface the same orgnr twice (page drift: the result
    # set shifts as entities are added while we page). Dedupe by orgnr so the
    # fylke15 upsert doesn't hit "ON CONFLICT cannot affect row a second time"
    # and we never process the same company twice.
    unique: dict[str, dict] = {c["orgnr"]: c for c in companies}
    log.info(
        "Fetched %d companies (%d unique) from Brreg for fylke %s",
        len(companies),
        len(unique),
        FYLKE_PREFIX,
    )
    return list(unique.values())


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
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="orgnr,snapshot_date",
    ).execute()


def get_latest_snapshot(sb: Client, orgnr: str, before: date) -> list[dict] | None:
    """Return roles from the most recent snapshot strictly before `before`.

    Incremental runs only snapshot companies that changed, so there is no
    guarantee a row exists for "yesterday" specifically — we compare against
    whatever the last stored state was.
    """
    resp = (
        sb.table("company_roles_snapshots")
        .select("roles, snapshot_date")
        .eq("orgnr", orgnr)
        .lt("snapshot_date", before.isoformat())
        .order("snapshot_date", desc=True)
        .limit(1)
        .execute()
    )
    if resp.data:
        return resp.data[0]["roles"]
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


# ── Membership set & cursor state (Supabase) ────────────────────────────────


def upsert_fylke15_companies(sb: Client, companies: list[dict]) -> None:
    """Refresh the fylke-15 membership set (used by incremental runs)."""
    now_iso = datetime.now(timezone.utc).isoformat()
    rows = [{"orgnr": c["orgnr"], "navn": c["navn"], "refreshed_at": now_iso} for c in companies]
    for i in range(0, len(rows), 500):
        sb.table("fylke15_companies").upsert(rows[i : i + 500], on_conflict="orgnr").execute()
    log.info("Refreshed fylke15_companies with %d rows", len(rows))


def load_fylke15_orgnr(sb: Client) -> dict[str, str]:
    """Load the full orgnr → navn map for fylke 15 (paginated past the 1k cap)."""
    out: dict[str, str] = {}
    page = 0
    size = 1000
    while True:
        resp = (
            sb.table("fylke15_companies")
            .select("orgnr, navn")
            .range(page * size, (page + 1) * size - 1)
            .execute()
        )
        rows = resp.data or []
        for r in rows:
            out[r["orgnr"]] = r.get("navn") or ""
        if len(rows) < size:
            break
        page += 1
    return out


def get_cursor(sb: Client) -> int | None:
    resp = (
        sb.table("jobbytte_state")
        .select("value")
        .eq("key", CURSOR_KEY)
        .maybe_single()
        .execute()
    )
    if resp.data and resp.data.get("value"):
        return int(resp.data["value"])
    return None


def set_cursor(sb: Client, value: int) -> None:
    sb.table("jobbytte_state").upsert(
        {"key": CURSOR_KEY, "value": str(value), "updated_at": datetime.now(timezone.utc).isoformat()},
        on_conflict="key",
    ).execute()


def fetch_updated_orgnr_since(
    client: httpx.Client, start_id: int | None
) -> tuple[set[str], int | None]:
    """Page the national Brreg updates feed and return the set of updated orgnr
    plus the highest oppdateringsid seen (the next cursor).

    The feed is ascending by oppdateringsid and inclusive, so we start at
    start_id + 1 to avoid reprocessing the last item. With no cursor yet we
    anchor on a date `INITIAL_LOOKBACK_DAYS` back, then switch to the id cursor.
    """
    orgnr_set: set[str] = set()
    max_id = start_id
    next_id: int | None = start_id + 1 if start_id is not None else None
    anchor_dato: str | None = (
        None
        if start_id is not None
        else (datetime.now(timezone.utc) - timedelta(days=INITIAL_LOOKBACK_DAYS)).strftime(
            "%Y-%m-%dT00:00:00.000Z"
        )
    )

    while True:
        params: dict = {"size": FEED_PAGE_SIZE}
        if next_id is not None:
            params["oppdateringsid"] = next_id
        else:
            params["dato"] = anchor_dato

        resp = client.get(
            f"{BRREG_BASE}/oppdateringer/enheter",
            params=params,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        items = resp.json().get("_embedded", {}).get("oppdaterteEnheter", [])
        if not items:
            break

        for it in items:
            orgnr_set.add(it["organisasjonsnummer"])
            oid = it["oppdateringsid"]
            if max_id is None or oid > max_id:
                max_id = oid

        if len(items) < FEED_PAGE_SIZE:
            break
        next_id = (max_id or 0) + 1
        time.sleep(THROTTLE_S)

    return orgnr_set, max_id


# ── Per-company processing ───────────────────────────────────────────────────


def emit_tips(
    sb: Client, orgnr: str, navn: str, old_roles: list[dict], new_roles: list[dict], today: date
) -> int:
    """Diff old vs new roles and insert a pending tip per interesting change."""
    added, removed = diff_roles(old_roles, new_roles)
    interesting_added = [
        r for r in added if r.get("type") in ROLE_TYPES_OF_INTEREST and not r.get("fratradt")
    ]
    interesting_removed = [r for r in removed if r.get("type") in ROLE_TYPES_OF_INTEREST]

    tips = 0

    for r in interesting_added:
        name = person_name(r)
        if not name:
            continue
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
        tips += 1
        log.info("TIP: %s → ny %s i %s", name, r.get("typeBeskrivelse"), navn)

    for r in interesting_removed:
        name = person_name(r)
        if not name:
            continue
        already_added = any(
            person_name(a) == name and a.get("type") == r.get("type") for a in interesting_added
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
        tips += 1
        log.info("TIP: %s fratrådt %s i %s", name, r.get("typeBeskrivelse"), navn)

    return tips


def process_company(sb: Client, http: httpx.Client, orgnr: str, navn: str, today: date) -> int:
    """Incremental path: fetch roles, diff against the last snapshot, emit tips,
    store snapshot. A company with no prior snapshot is baseline (no tips).

    Used by the daily run (~150 companies), where a per-company DB round trip is
    cheap. The full run uses a bulk-prefetch + batched-write path instead.
    """
    roles = fetch_roles(orgnr, http)
    old_roles = get_latest_snapshot(sb, orgnr, before=today)
    store_snapshot(sb, orgnr, roles, today)
    if old_roles is None:
        return 0
    return emit_tips(sb, orgnr, navn, old_roles, roles, today)


def load_prior_snapshots(sb: Client, before: date) -> dict[str, list[dict]]:
    """Bulk-load the latest snapshot per orgnr strictly before `before`.

    One paginated scan instead of a round trip per company — this is the change
    that keeps the full sweep inside its time budget. Rows are ordered by
    snapshot_date ascending so later dates overwrite earlier in the dict,
    leaving the most recent prior state per orgnr.
    """
    out: dict[str, list[dict]] = {}
    page = 0
    size = 1000
    while True:
        resp = (
            sb.table("company_roles_snapshots")
            .select("orgnr, roles, snapshot_date")
            .lt("snapshot_date", before.isoformat())
            .order("snapshot_date", desc=False)
            .order("orgnr", desc=False)
            .range(page * size, (page + 1) * size - 1)
            .execute()
        )
        rows = resp.data or []
        for r in rows:
            out[r["orgnr"]] = r["roles"]
        if len(rows) < size:
            break
        page += 1
    log.info("Prefetched prior snapshots for %d companies", len(out))
    return out


def flush_snapshots(sb: Client, buffer: list[dict]) -> None:
    """Upsert buffered snapshots in batches. Each orgnr appears once per run and
    snapshot_date is constant, so no (orgnr, snapshot_date) collides in a batch."""
    if not buffer:
        return
    for i in range(0, len(buffer), SNAPSHOT_BATCH):
        sb.table("company_roles_snapshots").upsert(
            buffer[i : i + SNAPSHOT_BATCH], on_conflict="orgnr,snapshot_date"
        ).execute()


# ── Run modes ────────────────────────────────────────────────────────────────


def run_full(sb: Client, http: httpx.Client, today: date) -> int:
    """Weekly safety net: list every company in the county and diff all.

    Avoids the two per-company Supabase round trips that timed out the first
    attempt: prior snapshots are prefetched in one scan and new snapshots are
    written in batches, leaving only the (unavoidable) one Brreg call per
    company in the hot loop.
    """
    companies = fetch_companies_in_fylke(http)
    if not companies:
        log.warning("No companies found — exiting")
        return 0

    upsert_fylke15_companies(sb, companies)
    prior = load_prior_snapshots(sb, before=today)

    now_iso = datetime.now(timezone.utc).isoformat()
    snapshot_buffer: list[dict] = []
    tips = 0
    errors = 0

    for i, comp in enumerate(companies):
        orgnr = comp["orgnr"]
        navn = comp["navn"]
        try:
            roles = fetch_roles(orgnr, http)
            snapshot_buffer.append(
                {
                    "orgnr": orgnr,
                    "snapshot_date": today.isoformat(),
                    "roles": roles,
                    "fetched_at": now_iso,
                }
            )
            if len(snapshot_buffer) >= SNAPSHOT_BATCH:
                flush_snapshots(sb, snapshot_buffer)
                snapshot_buffer = []

            old_roles = prior.get(orgnr)
            if old_roles is not None:
                tips += emit_tips(sb, orgnr, navn, old_roles, roles, today)
        except Exception:
            errors += 1
            log.exception("Error processing %s (%s)", orgnr, navn)

        if i % 1000 == 0 and i > 0:
            log.info(
                "Progress: %d/%d companies, %d tips, %d buffered",
                i,
                len(companies),
                tips,
                len(snapshot_buffer),
            )
        time.sleep(FULL_THROTTLE_S)

    flush_snapshots(sb, snapshot_buffer)
    log.info("Full run done. Companies: %d, tips: %d, errors: %d", len(companies), tips, errors)
    return tips


def run_incremental(sb: Client, http: httpx.Client, today: date) -> int:
    """Daily run: only diff companies the updates feed flags as changed."""
    fylke_set = load_fylke15_orgnr(sb)
    if not fylke_set:
        log.error(
            "fylke15_companies is empty — run a full sync first (JOBBYTTE_MODE=full). Aborting."
        )
        return 0

    start_id = get_cursor(sb)
    updated_orgnr, max_id = fetch_updated_orgnr_since(http, start_id)
    relevant = sorted(o for o in updated_orgnr if o in fylke_set)
    log.info(
        "Feed: %d national updates since cursor=%s, %d in fylke 15",
        len(updated_orgnr),
        start_id,
        len(relevant),
    )

    tips = 0
    errors = 0
    for orgnr in relevant:
        try:
            tips += process_company(sb, http, orgnr, fylke_set.get(orgnr, ""), today)
        except Exception:
            errors += 1
            log.exception("Error processing %s", orgnr)
        time.sleep(THROTTLE_S)

    # Advance the cursor only after a clean pass so a crash re-processes safely.
    if max_id is not None and max_id != start_id:
        set_cursor(sb, max_id)
        log.info("Cursor advanced to %d", max_id)

    log.info("Incremental run done. Checked: %d, tips: %d, errors: %d", len(relevant), tips, errors)
    return tips


# ── Main ───────────────────────────────────────────────────────────────────


def main() -> None:
    sb = get_supabase()
    today = date.today()
    log.info("Starting jobbytte, mode=%s", MODE)

    with httpx.Client(timeout=30) as http:
        if MODE == "full":
            tips = run_full(sb, http, today)
        else:
            tips = run_incremental(sb, http, today)

    log.info("Done. mode=%s tips_created=%d", MODE, tips)


if __name__ == "__main__":
    main()
