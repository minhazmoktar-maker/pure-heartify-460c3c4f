import Foundation

/// Presentation model shared by the watch app views and every WidgetKit
/// complication family. Kept in HeartifyKit (not the app target) so the whole
/// mapping from payload -> rendered strings is unit-testable without Xcode.
public struct ComplicationSnapshot: Equatable, Sendable {
    /// e.g. "Asr"
    public let prayerName: String
    /// Local clock, "HH:MM".
    public let prayerAt: String
    /// e.g. "in 42m", "in 3h 05m", "now".
    public let countdown: String
    /// Absolute date the countdown targets — used for `Text(timerInterval:)`.
    public let target: Date
    public let isTomorrow: Bool
    /// Streak days; nil when the watch has no signed-in session.
    public let streak: Int?
    /// Remaining salah for today; empty when unauthenticated.
    public let remaining: [String]
    public let isStale: Bool

    public init(
        prayerName: String,
        prayerAt: String,
        countdown: String,
        target: Date,
        isTomorrow: Bool,
        streak: Int?,
        remaining: [String],
        isStale: Bool
    ) {
        self.prayerName = prayerName
        self.prayerAt = prayerAt
        self.countdown = countdown
        self.target = target
        self.isTomorrow = isTomorrow
        self.streak = streak
        self.remaining = remaining
        self.isStale = isStale
    }

    /// Neutral placeholder for widget galleries and the pre-permission state.
    public static let placeholder = ComplicationSnapshot(
        prayerName: "Fajr",
        prayerAt: "05:12",
        countdown: "in 2h 30m",
        target: Date().addingTimeInterval(9000),
        isTomorrow: false,
        streak: 7,
        remaining: ["dhuhr", "asr", "maghrib", "isha"],
        isStale: false
    )

    /// One-line complication text, e.g. "Asr 17:04 · in 42m".
    public var line: String { "\(prayerName) \(prayerAt) · \(countdown)" }
}

public enum ComplicationMapper {
    public static func titleCase(_ raw: String) -> String {
        guard let first = raw.first else { return raw }
        return first.uppercased() + raw.dropFirst()
    }

    public static func countdown(minutes: Int) -> String {
        if minutes <= 0 { return "now" }
        if minutes < 60 { return "in \(minutes)m" }
        let h = minutes / 60
        let m = minutes % 60
        return m == 0 ? "in \(h)h" : String(format: "in %dh %02dm", h, m)
    }

    /// Maps a fetched snapshot into the render model. Falls back to recomputing
    /// the next prayer locally when the payload's `next` block is absent, so a
    /// cached payload still counts down correctly hours later.
    public static func map(_ snapshot: HeartifySnapshot, now: Date = Date()) -> ComplicationSnapshot? {
        let payload = snapshot.payload
        guard let prayer = payload.prayer else { return nil }
        let tz = prayer.tzOffset ?? (TimeZone.current.secondsFromGMT() / 60)
        let nowUTC = WatchClock.nowUTCMinutes(now)

        // Recompute against the current clock: a cached payload's `in_minutes`
        // was accurate only at fetch time.
        let next = WatchClock.resolveNextPrayer(times: prayer.timesUTC, nowMinutes: nowUTC)
            ?? payload.prayer?.next
        guard let next else { return nil }

        let localAt = WatchClock.toLocalClock(next.at, tzOffsetMinutes: tz) ?? next.at
        return ComplicationSnapshot(
            prayerName: titleCase(next.name.rawValue),
            prayerAt: localAt,
            countdown: countdown(minutes: next.inMinutes),
            target: now.addingTimeInterval(TimeInterval(max(0, next.inMinutes) * 60)),
            isTomorrow: next.isTomorrow,
            streak: payload.account?.streak.current,
            remaining: payload.account?.salahToday.remaining.map(\.rawValue) ?? [],
            isStale: snapshot.isStale
        )
    }

    /// Refresh cadence for WidgetKit: tighter near a prayer, relaxed far out,
    /// never below watchOS's practical budget of a few minutes.
    public static func nextRefresh(after snapshot: ComplicationSnapshot, now: Date = Date()) -> Date {
        let secondsToPrayer = snapshot.target.timeIntervalSince(now)
        let interval: TimeInterval
        switch secondsToPrayer {
        case ..<0: interval = 300
        case ..<1800: interval = 300
        case ..<7200: interval = 900
        default: interval = 1800
        }
        return now.addingTimeInterval(interval)
    }
}
