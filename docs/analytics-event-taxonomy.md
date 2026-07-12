# Analytics Event Taxonomy

All events inserted into `public.analytics_events` are validated by the
`validate_analytics_event()` trigger against `public.event_schemas`. Adding a
new event requires a row in `event_schemas` first (admin UI: `/admin/events`).

## Naming rules
- `snake_case`, present tense (`video_play`, not `videoPlayed`)
- Domain prefix optional but preferred (`dose_complete`, `khatm_progress`)
- Never include PII in `event_name` — put IDs in `properties`

## Property conventions
- `path` — pathname, no query string
- `video_id` — YouTube video id
- `experiment_key`, `variant_key` — for exposures
- `flag_key`, `enabled` — for flag evaluations
- `query` — user search text (already scrubbed of PII by client)
- `kind` — free-form for share/report/etc.

## Core events (seeded)
| Event | Required properties |
| --- | --- |
| `page_view` | `path` |
| `video_play` | `video_id` |
| `video_complete` | `video_id` |
| `daily_dose_complete` | — |
| `signup` | — |
| `login` | — |
| `experiment_exposure` | `experiment_key`, `variant_key` |
| `feature_flag_evaluated` | `flag_key`, `enabled` |
| `search` | `query` |
| `share` | `kind` |

Unknown events are rejected with `unknown_event: <name>`.
Missing required props are rejected with `missing_required_property: <p> for event <name>`.
