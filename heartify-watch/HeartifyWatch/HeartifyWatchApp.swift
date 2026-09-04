import SwiftUI
import HeartifyKit

/// watchOS app entry point. Target: `HeartifyWatch` (watchOS 10+).
/// Add this file to the watch app target in Xcode — see docs/WATCHOS_SETUP.md.
@main
struct HeartifyWatchApp: App {
    @StateObject private var model = WatchGlanceModel()

    var body: some Scene {
        WindowGroup {
            GlanceView(model: model)
                .task { await model.refresh() }
        }
    }
}
