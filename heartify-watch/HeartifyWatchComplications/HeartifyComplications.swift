import WidgetKit
import SwiftUI
import CoreLocation
import HeartifyKit

/// WidgetKit bundle for the watch complication families and the iOS Smart Stack
/// widget. Target: `HeartifyWatchComplications` (Widget Extension, watchOS 10+).
@main
struct HeartifyComplicationBundle: WidgetBundle {
    var body: some Widget {
        NextPrayerComplication()
        StreakComplication()
    }
}

// MARK: - Timeline entry

struct PrayerEntry: TimelineEntry {
    let date: Date
    let snapshot: ComplicationSnapshot
}

// MARK: - Provider

struct PrayerProvider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry {
        PrayerEntry(date: Date(), snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
        if context.isPreview {
            completion(PrayerEntry(date: Date(), snapshot: .placeholder))
            return
        }
        Task { completion(await entry()) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        Task {
            let current = await entry()
            // A short in-process timeline keeps the countdown honest between
            // system refreshes without spending extra network budget.
            var entries: [PrayerEntry] = [current]
            for step in stride(from: 5, through: 30, by: 5) {
                let date = current.date.addingTimeInterval(TimeInterval(step * 60))
                let minutes = max(0, Int(current.snapshot.target.timeIntervalSince(date) / 60))
                entries.append(
                    PrayerEntry(
                        date: date,
                        snapshot: ComplicationSnapshot(
                            prayerName: current.snapshot.prayerName,
                            prayerAt: current.snapshot.prayerAt,
                            countdown: ComplicationMapper.countdown(minutes: minutes),
                            target: current.snapshot.target,
                            isTomorrow: current.snapshot.isTomorrow,
                            streak: current.snapshot.streak,
                            remaining: current.snapshot.remaining,
                            isStale: current.snapshot.isStale
                        )
                    )
                )
            }
            let refresh = ComplicationMapper.nextRefresh(after: current.snapshot, now: current.date)
            completion(Timeline(entries: entries, policy: .after(refresh)))
        }
    }

    private func entry() async -> PrayerEntry {
        let coordinate = CLLocationManager().location?.coordinate
        let fetched = await HeartifyClient().snapshot(
            latitude: coordinate?.latitude,
            longitude: coordinate?.longitude,
            accessToken: HeartifySession.token()
        )
        let mapped = fetched.flatMap { ComplicationMapper.map($0) } ?? .placeholder
        return PrayerEntry(date: Date(), snapshot: mapped)
    }
}

// MARK: - Next prayer

struct NextPrayerComplication: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "HeartifyNextPrayer", provider: PrayerProvider()) { entry in
            NextPrayerView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Next Prayer")
        .description("Time and countdown to your next salah.")
        .supportedFamilies([
            .accessoryCircular, .accessoryCorner, .accessoryInline, .accessoryRectangular,
        ])
    }
}

struct NextPrayerView: View {
    @Environment(\.widgetFamily) private var family
    let entry: PrayerEntry

    var body: some View {
        switch family {
        case .accessoryInline:
            Text(entry.snapshot.line)
        case .accessoryCircular:
            VStack(spacing: 0) {
                Text(String(entry.snapshot.prayerName.prefix(3))).font(.caption2)
                Text(entry.snapshot.prayerAt).font(.system(size: 14, weight: .semibold))
            }
            .accessibilityLabel("\(entry.snapshot.prayerName) at \(entry.snapshot.prayerAt)")
        case .accessoryCorner:
            Text(entry.snapshot.prayerAt)
                .widgetCurvesContent()
                .widgetLabel(entry.snapshot.prayerName)
        default:
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.snapshot.isTomorrow ? "Tomorrow" : "Next")
                    .font(.caption2).foregroundStyle(.secondary)
                Text("\(entry.snapshot.prayerName) \(entry.snapshot.prayerAt)")
                    .font(.headline)
                Text(entry.snapshot.countdown)
                    .font(.caption).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
        }
    }
}

// MARK: - Streak

struct StreakComplication: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "HeartifyStreak", provider: PrayerProvider()) { entry in
            StreakView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Heartify Streak")
        .description("Your salah streak and what's left today.")
        .supportedFamilies([.accessoryCircular, .accessoryInline, .accessoryRectangular])
    }
}

struct StreakView: View {
    @Environment(\.widgetFamily) private var family
    let entry: PrayerEntry

    private var streakText: String {
        entry.snapshot.streak.map { "\($0)d" } ?? "—"
    }

    var body: some View {
        switch family {
        case .accessoryInline:
            Text("Streak \(streakText)")
        case .accessoryCircular:
            VStack(spacing: 0) {
                Image(systemName: "flame").font(.caption2)
                Text(streakText).font(.system(size: 14, weight: .semibold))
            }
            .accessibilityLabel("Streak \(streakText)")
        default:
            VStack(alignment: .leading, spacing: 2) {
                Label("Streak \(streakText)", systemImage: "flame").font(.headline)
                Text(
                    entry.snapshot.remaining.isEmpty
                        ? "All salah logged"
                        : entry.snapshot.remaining.map(ComplicationMapper.titleCase).joined(separator: " · ")
                )
                .font(.caption).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
        }
    }
}
