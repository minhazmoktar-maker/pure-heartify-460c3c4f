# Analytics Event Taxonomy

All events inserted into `public.analytics_events` are validated by the
`validate_analytics_event()` trigger against `public.event_schemas`. Adding a
new event requires a row in `event_schemas` first (admin UI: `/admin/events`).

## Naming rules
- `snake_case`, present tense (`video_play`, not `videoPlayed`)
- Funnel-stage prefix preferred for new events (`activation.first_video_played`)
- Legacy events keep flat names (`streak_activity_recorded`)
- Never include PII in `event_name` — put opaque IDs in `properties`, never emails or names

## Property conventions
- `path` — pathname only, no query string
- `video_id` — YouTube video id (opaque)
- `experiment_key`, `variant_key` — for exposures
- `flag_key`, `enabled` — for flag evaluations
- `query_len` — search string length, never the raw query
- `source` — feed / section identifier for recommendations
- `channel` — share / referral surface (`copy`, `share`, `qr`, …)
- `kind` — free-form for `share`, `report`, etc.

## Registered events (as of Phase 7)

### Core lifecycle
| Event | Required properties |
| --- | --- |
| `page_view` | `path` |
| `signup` | — |
| `login` | — |
| `video_play` | `video_id` |
| `video_complete` | `video_id` |
| `daily_dose_complete` | — |
| `search` | `query` |
| `share` | `kind` |
| `experiment_exposure` | `experiment_key`, `variant_key` |
| `feature_flag_evaluated` | `flag_key`, `enabled` |

### Acquisition
| Event | Required properties |
| --- | --- |
| `acquisition.visited` | `path` |
| `acquisition.signed_up` | `method` |

### Activation
| Event | Required properties |
| --- | --- |
| `activation.onboarding_started` | — |
| `activation.onboarding_completed` | `interest_count` |
| `activation.first_video_played` | `video_id` |
| `activation.first_favorite` | `video_id` |

### Search
| Event | Required properties |
| --- | --- |
| `search.issued` | `query_len`, `result_count` |
| `search.no_results` | `query_len` |
| `search.result_clicked` | `query_len`, `video_id`, `position` |

### Recommendations
| Event | Required properties |
| --- | --- |
| `recommendation.impression` | `video_id`, `source` |
| `recommendation.clicked` | `video_id`, `source`, `position` |
| `recommendation.dismissed` | `video_id`, `source` |

### Favorites / Premium / Referral / Retention
| Event | Required properties |
| --- | --- |
| `favorites.added` / `favorites.removed` | `video_id` |
| `premium.surface_viewed` / `premium.upgrade_clicked` | `surface` |
| `premium.purchased` | `plan`, `amount_usd` |
| `referral.link_copied` / `referral.invited` | `channel` |
| `referral.redeemed` | `code_len` |
| `retention.daily_dose_completed` | `day_offset` |
| `retention.streak_extended` | `length` |

### Admin & moderation
| Event |
| --- |
| `audit_page_view`, `audit_run_started`, `audit_run_completed`, `audit_run_failed` |
| `admin_pattern_blocked`, `admin_pattern_unblocked` |
| `moderation_log_view`, `moderation_log_loaded`, `moderation_log_load_failed` |

### Group Khatm & legacy referral aliases
`khatm_group_created`, `khatm_group_joined`, `khatm_group_joined_via_link`,
`khatm_invite_copied`, `khatm_invite_shared`, `khatm_juz_claimed`,
`khatm_juz_completed`, `referral_link_copied`, `referral_link_shared`,
`streak_activity_recorded`, `perf`.

## Validation
Unknown events are rejected with `unknown_event: <name>`.
Missing required props are rejected with `missing_required_property: <p> for event <name>`.

Client-side `track()` swallows these errors (analytics must never break UX) and
logs a warning in development.
