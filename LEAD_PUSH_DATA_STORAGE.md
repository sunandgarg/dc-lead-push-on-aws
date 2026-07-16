# Lead Push data and cache map

## Supabase database

| Data | Table | When it is written | Retention |
|---|---|---|---|
| Upload/task header, file name, university, totals, status and counters | `upload_batches` | Immediate CSV Push Now, single-lead Lead Push, webhook and Multi-Push jobs | Batch metadata remains as upload history; `csv_data` is not written by Lead Push |
| Full individual Lead Push rows | Not stored | CSV Push Now and single-lead Lead Push call the Edge Function directly | Scheduled Lead Push is disabled because it would require storing lead payloads |
| Partner request/result logs for each pushed lead | Not stored by Lead Push | Responses stay in memory for the current screen only | Other modules may still use `api_logs`, but Lead Push avoids per-lead logs |
| Daily dashboard totals | `lead_push_daily_stats` | Every processed partner push | Retained as reporting aggregates |
| Lifetime dashboard totals | `lead_push_cumulative_stats` | Every processed partner push | Retained as reporting aggregates |

The normal CSV **Push Now** path does not insert each lead into `public.leads`.
It sends bounded batches directly to the `process-lead` Edge Function and stores
only the `upload_batches` record plus aggregate statistics. Scheduled Lead Push
is disabled in no-storage mode because scheduling needs a server-side copy of
each lead until the scheduled time.

Upload History and Active Tasks are not separate copies. Both read
`upload_batches`. Active Tasks now queries only `processing`, `pending`, `paused`
and `scheduled`; completed/cancelled records are shown only in Upload History.

## Browser storage used by the active upload screen

| Storage | Key | Contents |
|---|---|---|
| `localStorage` | `dekhocampus_upload_v3` | Lightweight upload metadata only: file name, mapping, validation flags, statuses and counters. CSV text, parsed leads, partner responses and request payloads are not persisted |
| `localStorage` | `dekhocampus_upload_processing_v1` | Current batch ID, pause/running state, index and start time |
| `localStorage` | `csv_mapping_<university-id>` | Saved CSV-to-lead field mapping |
| `localStorage` | `upload:lastSourceLabel` | Last source label entered |
| `localStorage` | `dekhocampus_app_cache_v3` | Cached universities, logs, batches and UI navigation state |
| `sessionStorage` | `dekhocampus_session_state_v2` | Route and scroll-position state for the current tab/session |
| Memory only | Upload History cache | Last query for 30 seconds |
| Memory only | Active Tasks university/user maps | Lookup names until the page is reloaded |
| `localStorage` | `lpAdminDashboardCache.v2` | Admin dashboard universities and aggregate statistics |

The files under `src/lib/datastore` define an older IndexedDB/localStorage
three-tier datastore. The current Lead Push upload screen does not import that
DataStore; it uses `useUploadStatePersistence` and Supabase directly.

## Cleanup

Deploy and schedule the `cleanup-old-data` Edge Function to enforce the 72-hour
cleanup. It removes old `api_logs`, `leads`, and CRM activities while preserving
the compact `upload_batches` history record.
