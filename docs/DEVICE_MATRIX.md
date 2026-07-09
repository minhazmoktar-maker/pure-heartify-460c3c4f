# Heartify Device / Capability Matrix

| Capability          | Web | iOS | Android | watchOS | Wear OS | tvOS / AndroidTV | CarPlay / AndroidAuto |
| ------------------- | --- | --- | ------- | ------- | ------- | ---------------- | --------------------- |
| Auth (JWT)          | ✅   | ✅   | ✅       | ✅ (via phone) | ✅ (via phone) | ✅               | ✅ (via phone)         |
| Streaming           | ✅   | ✅   | ✅       | —       | —       | ✅ (audio + video) | ✅ (audio only)      |
| Prayer times        | ✅   | ✅   | ✅       | ✅       | ✅       | ✅                | ✅                     |
| Qibla               | ✅   | ✅   | ✅       | ✅       | ✅       | —                | —                     |
| Dhikr counter       | ✅   | ✅   | ✅       | ✅       | ✅       | ✅                | Voice only            |
| Salah tracker       | ✅   | ✅   | ✅       | ✅       | ✅       | ✅                | —                     |
| Widgets / Glances   | —   | ✅   | ✅       | ✅       | ✅       | —                | —                     |
| Complications       | —   | —   | —       | ✅       | ✅       | —                | —                     |
| Downloads (premium) | —   | ✅   | ✅       | limited | limited | ✅                | —                     |
| Admin consoles      | ✅   | —   | —       | —       | —       | —                | —                     |

`/client-bootstrap` returns the client's active capability set so each device
UI enables only what the platform supports. Add new platforms by extending the
`Platform` union in `src/lib/shared/types.ts` and the enum on
`device_registrations.platform`.
