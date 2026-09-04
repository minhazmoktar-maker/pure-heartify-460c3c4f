import Foundation
import CoreLocation
import WidgetKit
import HeartifyKit

/// Single source of truth for the watch app UI.
///
/// One network call per refresh (`watch-companion`), coarse location only, and
/// the last good payload is reused when offline so the glance is never empty.
@MainActor
final class WatchGlanceModel: NSObject, ObservableObject {
    @Published var snapshot: ComplicationSnapshot?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var authenticated = false

    private let client = HeartifyClient()
    private let locations = CLLocationManager()

    override init() {
        super.init()
        locations.delegate = self
        locations.desiredAccuracy = kCLLocationAccuracyReduced
    }

    func requestLocationIfNeeded() {
        if locations.authorizationStatus == .notDetermined {
            locations.requestWhenInUseAuthorization()
        }
    }

    func refresh() async {
        requestLocationIfNeeded()
        isLoading = true
        defer { isLoading = false }

        let coordinate = locations.location?.coordinate
        let fetched = await client.snapshot(
            latitude: coordinate?.latitude,
            longitude: coordinate?.longitude,
            accessToken: HeartifySession.token()
        )
        guard let fetched else {
            errorMessage = "Can't reach Heartify. Open the iPhone app once, then try again."
            return
        }
        authenticated = fetched.payload.authenticated
        errorMessage = nil
        snapshot = ComplicationMapper.map(fetched)
        // Keep every complication family in step with the app.
        WidgetCenter.shared.reloadAllTimelines()
    }
}

extension WatchGlanceModel: CLLocationManagerDelegate {
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if manager.authorizationStatus == .authorizedWhenInUse {
            manager.requestLocation()
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        Task { @MainActor in await self.refresh() }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            if self.snapshot == nil {
                self.errorMessage = "Location unavailable — prayer times need a coarse location."
            }
        }
    }
}
