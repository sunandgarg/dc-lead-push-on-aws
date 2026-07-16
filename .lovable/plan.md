## Scope

Five tightly related features around Lead Push monitoring + governance. All built in one pass.

---

### 1. Daily Lead Limit (DLL) per university

**DB**: add `daily_lead_limit INT` (nullable, NULL = unlimited) and `daily_pushed_count INT DEFAULT 0`, `daily_count_reset_at DATE` to `universities`.

**UI**: in `UniversityInfoPanel` (next to the leads/min slider), add an editable DLL field with Save button. Also expose on Add/Edit University modals.

**Enforcement**: in `process-lead` edge function (and queue processor), before pushing check `daily_pushed_count` vs `daily_lead_limit`. If reset date < today, reset counter to 0 first. If over limit, mark lead status `dll_blocked` and skip. Increment counter on success/fail (any actual push attempt).

**Admin override**: add `daily_lead_limit_locked` to existing `rate_limit_config` in `app_settings` so admin can set a global cap (mirrors the existing rate-limit lock pattern).

---

### 2. Lead Push Admin Dashboard

New route `/lead-push/admin` and a card on `LeadPushHub`.

**Top KPIs (today)**: Total Pushed, Success, Failed, Duplicate, Other Errors, DLL Blocked, Pending.

**University grid**: one tile per university showing:
- Status dot: green (healthy, pushing), amber (rate/DLL near cap), red (errors > threshold or API down), gray (idle).
- Today's counts: pushed / success / fail / dup.
- DLL usage bar (e.g. 340 / 1000).
- Last push timestamp.
- Click tile → drawer with last 50 push attempts + per-status breakdown + recent error samples.

Manual refresh button (no polling — per project memory).

---

### 3. Daily lead-status rollup

**New table** `lead_push_daily_stats`:
- `university_id`, `date`, `source_label` (nullable), `pushed`, `success`, `failed`, `duplicate`, `other_error`, `dll_blocked`.
- Unique `(university_id, date, source_label)`.

**Update path**: `process-lead` (and queue processor) calls a small `upsert_daily_stat(university_id, date, source, status)` SQL function that increments the right column. This survives the 72-hour retention purge of raw logs since it's pre-aggregated.

Retention: keep daily rollups for 13 months (not purged by the 72-hour job).

---

### 4. Cumulative stats + "source of data" tag on uploads

**New table** `lead_push_cumulative_stats` (single row per university or per university+source):
- `university_id`, `source_label`, `total_pushed`, `total_success`, `total_failed`, `total_duplicate`, `total_other_error`, `first_pushed_at`, `last_pushed_at`.
- Updated in the same trigger/function as the daily rollup.

**Source-of-data input**: in `UploadLeadsTab`, after CSV column mapping and before "Start Processing", add a required `Source of Data` text field (free text, e.g. "Meta Ads – Jan campaign", "Justdial export 2026-03"). Saved on:
- the upload batch (`upload_batches.source_label` — new column),
- each lead row (`leads.source_label` — new column),
- propagated into `api_logs.source_label` and into the daily/cumulative stats rollup.

**History view**: new tab on the admin dashboard "Upload Sources" — filter/search uploads by source label, see date pushed, counts, university. Lets you answer "what data did I push 2 months ago".

---

### 5. Build approach

Single migration for all schema changes (3 new columns + 2 new tables + 1 SQL function), then edge function updates, then frontend (admin dashboard + DLL field + source input). Reuses existing patterns: `app_settings` for admin lock, manual-refresh UI per memory, no auto-polling.

---

## Technical notes

- New tables get `GRANT SELECT, INSERT, UPDATE ON ... TO authenticated; GRANT ALL TO service_role;` + RLS via `is_user_approved`.
- `upsert_daily_stat` is `SECURITY DEFINER` so edge functions can call it via service role.
- `process-lead` change is additive — existing flow unchanged when DLL is NULL and no source_label provided.
- Admin dashboard reads from `lead_push_daily_stats` (fast) instead of scanning `api_logs`.
- No new dependencies.

## Files

**New**:
- `supabase/migrations/<ts>_lead_push_governance.sql`
- `src/components/leadpush/admin/LeadPushAdminDashboard.tsx`
- `src/components/leadpush/admin/UniversityStatusTile.tsx`
- `src/components/leadpush/admin/UploadSourcesView.tsx`

**Edited**:
- `supabase/functions/process-lead/index.ts` (DLL check + stats upsert + source_label)
- `supabase/functions/process-queue/index.ts` (same)
- `src/components/upload/UniversityInfoPanel.tsx` (DLL slider/input)
- `src/components/upload/UploadLeadsTab.tsx` (source of data field)
- `src/components/universities/AddUniversityModal.tsx` + `EditUniversityModal.tsx` (DLL field)
- `src/components/leadpush/LeadPushHub.tsx` + `LeadPushModule.tsx` (route + nav)
- `src/components/settings/AdminRateLimitControl.tsx` (DLL global lock)

## What I won't touch

- 72-hour retention policy on raw tables (rollups handle long-term history).
- Existing queue/active-tasks polling behavior (still manual refresh per memory).
- Lead push batch caps (still unbounded per memory).

Confirm and I'll ship it in one pass.