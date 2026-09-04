import SwiftUI
import HeartifyKit

/// The watch app's only screen: next prayer, today's remaining salah, streak.
/// Calm and legible at a glance — no feed, no video, no scroll trap.
struct GlanceView: View {
    @ObservedObject var model: WatchGlanceModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                if let snapshot = model.snapshot {
                    NextPrayerCard(snapshot: snapshot)
                    if !snapshot.remaining.isEmpty {
                        RemainingSalahRow(remaining: snapshot.remaining)
                    }
                    if let streak = snapshot.streak {
                        Label("\(streak)-day streak", systemImage: "flame")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    if snapshot.isStale {
                        Text("Showing last saved times")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                } else if model.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, alignment: .center)
                } else {
                    Text(model.errorMessage ?? "No prayer times yet.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Button {
                    Task { await model.refresh() }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(.bordered)
                .accessibilityLabel("Refresh prayer times")
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("Heartify")
    }
}

private struct NextPrayerCard: View {
    let snapshot: ComplicationSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(snapshot.isTomorrow ? "Tomorrow" : "Next")
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(snapshot.prayerName)
                .font(.title3.weight(.semibold))
            HStack(spacing: 6) {
                Text(snapshot.prayerAt).font(.headline)
                Text(snapshot.countdown)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(8)
        .background(.quaternary, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(snapshot.prayerName) at \(snapshot.prayerAt), \(snapshot.countdown)")
    }
}

private struct RemainingSalahRow: View {
    let remaining: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Remaining today").font(.caption2).foregroundStyle(.secondary)
            Text(remaining.map(ComplicationMapper.titleCase).joined(separator: " · "))
                .font(.footnote)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview {
    GlanceView(model: WatchGlanceModel())
}
