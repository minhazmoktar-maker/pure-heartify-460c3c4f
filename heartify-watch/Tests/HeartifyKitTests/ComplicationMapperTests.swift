import XCTest
@testable import HeartifyKit

final class ComplicationMapperTests: XCTestCase {
    private func payload(next: WatchNextPrayer?, authenticated: Bool) -> WatchCompanionPayload {
        let json = """
        {
          "schema": 1,
          "server_time": "2026-09-04T06:00:00.000Z",
          "authenticated": \(authenticated),
          "prayer": {
            "method": "MWL",
            "date": "2026-09-04",
            "times_utc": {
              "fajr": "22:30", "sunrise": "00:00", "dhuhr": "06:10",
              "asr": "09:40", "maghrib": "12:20", "isha": "13:40"
            },
            "tz_offset": 360,
            "next": null
          },
          "account": \(authenticated ? """
          {
            "streak": {"current": 12, "longest": 30, "last_completed_date": "2026-09-03"},
            "dhikr": {"count": 33, "target": 100},
            "salah_today": {"logged": ["fajr"], "remaining": ["dhuhr", "asr", "maghrib", "isha"]}
          }
          """ : "null")
        }
        """
        return try! JSONDecoder().decode(WatchCompanionPayload.self, from: Data(json.utf8))
    }

    func testCountdownFormatting() {
        XCTAssertEqual(ComplicationMapper.countdown(minutes: 0), "now")
        XCTAssertEqual(ComplicationMapper.countdown(minutes: 42), "in 42m")
        XCTAssertEqual(ComplicationMapper.countdown(minutes: 120), "in 2h")
        XCTAssertEqual(ComplicationMapper.countdown(minutes: 185), "in 3h 05m")
    }

    func testMapsNextPrayerInLocalClock() {
        // 06:00 UTC -> next UTC prayer is dhuhr 06:10, local (+360) 12:10.
        let now = ISO8601DateFormatter().date(from: "2026-09-04T06:00:00Z")!
        let snapshot = HeartifySnapshot(payload: payload(next: nil, authenticated: true), fetchedAt: now, isStale: false)
        let mapped = ComplicationMapper.map(snapshot, now: now)
        XCTAssertEqual(mapped?.prayerName, "Dhuhr")
        XCTAssertEqual(mapped?.prayerAt, "12:10")
        XCTAssertEqual(mapped?.countdown, "in 10m")
        XCTAssertEqual(mapped?.streak, 12)
        XCTAssertEqual(mapped?.remaining, ["dhuhr", "asr", "maghrib", "isha"])
    }

    func testWrapsPastLastPrayerToTomorrow() {
        let now = ISO8601DateFormatter().date(from: "2026-09-04T23:30:00Z")!
        let snapshot = HeartifySnapshot(payload: payload(next: nil, authenticated: false), fetchedAt: now, isStale: true)
        let mapped = ComplicationMapper.map(snapshot, now: now)
        XCTAssertEqual(mapped?.prayerName, "Dhuhr")
        XCTAssertTrue(mapped?.isTomorrow ?? false)
        XCTAssertNil(mapped?.streak, "unauthenticated payloads must never carry account data")
        XCTAssertTrue(mapped?.isStale ?? false)
    }

    func testRefreshCadenceTightensNearPrayer() {
        let now = Date()
        let near = ComplicationSnapshot(
            prayerName: "Asr", prayerAt: "17:00", countdown: "in 10m",
            target: now.addingTimeInterval(600), isTomorrow: false, streak: nil, remaining: [], isStale: false
        )
        let far = ComplicationSnapshot(
            prayerName: "Fajr", prayerAt: "05:00", countdown: "in 6h",
            target: now.addingTimeInterval(21600), isTomorrow: true, streak: nil, remaining: [], isStale: false
        )
        XCTAssertEqual(ComplicationMapper.nextRefresh(after: near, now: now).timeIntervalSince(now), 300, accuracy: 1)
        XCTAssertEqual(ComplicationMapper.nextRefresh(after: far, now: now).timeIntervalSince(now), 1800, accuracy: 1)
    }
}
