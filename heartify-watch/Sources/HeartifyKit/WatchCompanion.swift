import Foundation

/// Swift port of `src/lib/shared/watch.ts`. Keep both sides additive-only:
/// watch binaries update slowly, so old builds must keep parsing new payloads.
public enum PrayerName: String, CaseIterable, Codable, Sendable {
    case fajr, dhuhr, asr, maghrib, isha

    /// Canonical daily order (not clock order — the payload is UTC).
    public static let order: [PrayerName] = [.fajr, .dhuhr, .asr, .maghrib, .isha]
}

public struct WatchNextPrayer: Codable, Equatable, Sendable {
    public let name: PrayerName
    /// UTC clock string, "HH:MM".
    public let at: String
    public let inMinutes: Int
    public let isTomorrow: Bool

    enum CodingKeys: String, CodingKey {
        case name, at
        case inMinutes = "in_minutes"
        case isTomorrow = "is_tomorrow"
    }

    public init(name: PrayerName, at: String, inMinutes: Int, isTomorrow: Bool) {
        self.name = name
        self.at = at
        self.inMinutes = inMinutes
        self.isTomorrow = isTomorrow
    }
}

public struct WatchPrayerBlock: Codable, Equatable, Sendable {
    public let method: String
    public let date: String?
    /// Keys are prayer names plus "sunrise"; values are UTC "HH:MM".
    public let timesUTC: [String: String]
    /// Caller-supplied UTC offset in minutes, echoed for display formatting.
    public let tzOffset: Int?
    public let next: WatchNextPrayer?

    enum CodingKeys: String, CodingKey {
        case method, date, next
        case timesUTC = "times_utc"
        case tzOffset = "tz_offset"
    }
}

public struct WatchStreak: Codable, Equatable, Sendable {
    public let current: Int
    public let longest: Int
    public let lastCompletedDate: String?

    enum CodingKeys: String, CodingKey {
        case current, longest
        case lastCompletedDate = "last_completed_date"
    }
}

public struct WatchDhikr: Codable, Equatable, Sendable {
    public let count: Int
    public let target: Int?
}

public struct WatchSalahToday: Codable, Equatable, Sendable {
    public let logged: [String]
    public let remaining: [PrayerName]
}

public struct WatchAccountBlock: Codable, Equatable, Sendable {
    public let streak: WatchStreak
    public let dhikr: WatchDhikr?
    public let salahToday: WatchSalahToday

    enum CodingKeys: String, CodingKey {
        case streak, dhikr
        case salahToday = "salah_today"
    }
}

public struct WatchCompanionPayload: Codable, Equatable, Sendable {
    public let schema: Int
    public let serverTime: String
    public let authenticated: Bool
    public let prayer: WatchPrayerBlock?
    public let account: WatchAccountBlock?

    enum CodingKeys: String, CodingKey {
        case schema, authenticated, prayer, account
        case serverTime = "server_time"
    }
}

// MARK: - Clock helpers (mirrors clockToMinutes / resolveNextPrayer / toLocalClock)

public enum WatchClock {
    /// Minutes since midnight for an "HH:MM" clock string.
    public static func minutes(from hhmm: String) -> Int? {
        let parts = hhmm.split(separator: ":")
        guard parts.count >= 2, let h = Int(parts[0]), let m = Int(parts[1]) else { return nil }
        return h * 60 + m
    }

    /// Next prayer for a complication countdown. Wraps to the first prayer of
    /// the following day after Isha so a watch face never renders a blank slot.
    public static func resolveNextPrayer(
        times: [String: String],
        nowMinutes: Int
    ) -> WatchNextPrayer? {
        // Sorted by clock, not canonical order: the payload is UTC, so for
        // eastern longitudes Fajr can carry the largest minute-of-day value.
        let known = PrayerName.order.compactMap { name -> (PrayerName, String, Int)? in
            guard let at = times[name.rawValue], let mins = minutes(from: at) else { return nil }
            return (name, at, mins)
        }.sorted { $0.2 < $1.2 }
        guard let first = known.first else { return nil }

        if let upcoming = known.first(where: { $0.2 > nowMinutes }) {
            return WatchNextPrayer(
                name: upcoming.0, at: upcoming.1,
                inMinutes: upcoming.2 - nowMinutes, isTomorrow: false
            )
        }
        return WatchNextPrayer(
            name: first.0, at: first.1,
            inMinutes: 24 * 60 - nowMinutes + first.2, isTomorrow: true
        )
    }

    /// Converts a UTC clock string to the caller's local clock for display.
    public static func toLocalClock(_ hhmm: String, tzOffsetMinutes: Int) -> String? {
        guard let mins = minutes(from: hhmm) else { return nil }
        let total = ((mins + tzOffsetMinutes) % 1440 + 1440) % 1440
        return String(format: "%02d:%02d", total / 60, total % 60)
    }

    /// Current minute-of-day in UTC — the reference frame of `times_utc`.
    public static func nowUTCMinutes(_ date: Date = Date()) -> Int {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(secondsFromGMT: 0)!
        let c = cal.dateComponents([.hour, .minute], from: date)
        return (c.hour ?? 0) * 60 + (c.minute ?? 0)
    }
}
