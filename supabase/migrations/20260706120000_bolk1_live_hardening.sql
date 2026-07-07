-- Security review 2026-07-06 — bolk 1: live, low-risk hardening.
-- Design + rationale: docs/security-bolk1-live-hardening.md (approved by Magnus 2026-07-06).
-- Non-destructive: tightens RLS/storage and pins a function search_path. No schema change.

-- 1) profiles UPDATE policy had a USING clause but no WITH CHECK, so a user could
--    set their own row's user_id to another user's id (row-hijack) or otherwise
--    write a row that no longer satisfies the owner predicate. Validate the
--    resulting row. ALTER (not DROP+CREATE) so the policy is never absent.
--    Intentionally does NOT restrict editorial_region / spor_enabled / region etc.
--    — those are user-writable profile preferences (see src/components/ProfileEditor.tsx).
alter policy "Users can update their own profile"
  on public.profiles
  with check (auth.uid() = user_id);

-- 2) Public storage buckets do NOT need a broad SELECT policy to serve objects via
--    the public CDN URL (/object/public/...); that policy only enables listing/
--    enumeration through the storage API. Drop it for all six public buckets so
--    unpublished draft images (article-images) and other bucket contents cannot be
--    enumerated. getPublicUrl() rendering is unaffected, and nothing in the app calls
--    storage .list() on these buckets. Private buckets (article-sources,
--    trusted-sources, article-audio, audio-uploads) keep their role-gated policies.
drop policy if exists "Anyone can view article-images" on storage.objects;
drop policy if exists "Anyone can view author-avatars" on storage.objects;
drop policy if exists "Anyone can view avatars"        on storage.objects;
drop policy if exists "Anyone can view event-images"   on storage.objects;
drop policy if exists "Public can view event images"   on storage.objects; -- duplicate on event-images
drop policy if exists "Anyone can view job-images"     on storage.objects;
drop policy if exists "Anyone can view job-logos"      on storage.objects;

-- 3) Pin search_path on slugify_display_name (advisor: mutable search_path). The
--    body uses only pg_catalog builtins (lower/replace/regexp_replace/substring/
--    length/trim) with no table or schema references, so an empty search_path is safe.
alter function public.slugify_display_name(text) set search_path = '';
