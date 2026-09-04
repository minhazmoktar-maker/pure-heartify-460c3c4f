import Foundation

/// Networking layer for the watch app + WidgetKit complications.
///
/// Deliberately tiny: one GET against `functions/v1/watch-companion`, which
/// returns the whole complication payload in a single round trip. Watch radios
/// are expensive, so complications must never fan out to several endpoints.
///
/// Auth is optional. With no token the endpoint returns prayer data only; with
/// a bearer token it also returns streak / dhikr / salah glance data.
public struct HeartifyEnvironment: Sendable {
    public let functionsBaseURL: URL
    public let anonKey: String

    public init(functionsBaseURL: URL, anonKey: String) {
        self.functionsBaseURL = functionsBaseURL
        self.anonKey = anonKey
    }

    /// Production Lovable Cloud backend. The anon key is a publishable key.
    public static let production = HeartifyEnvironment(
        functionsBaseURL: URL(string: "https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1")!,
        anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE"
    )
}

public enum HeartifyClientError: Error, Sendable {
    case badStatus(Int)
    case decoding(String)
    case transport(String)
}

/// Where the payload came from — the UI shows a "last updated" hint and
/// complications must not present stale data as live.
public struct HeartifySnapshot: Equatable, Sendable {
    public let payload: WatchCompanionPayload
    public let fetchedAt: Date
    public let isStale: Bool

    public init(payload: WatchCompanionPayload, fetchedAt: Date, isStale: Bool) {
        self.payload = payload
        self.fetchedAt = fetchedAt
        self.isStale = isStale
    }
}

/// Abstracted so tests (and SwiftUI previews) can inject a canned response
/// without touching the network.
public protocol HeartifyTransport: Sendable {
    func data(for request: URLRequest) async throws -> (Data, URLResponse)
}

extension URLSession: HeartifyTransport {
    public func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        try await self.data(for: request, delegate: nil)
    }
}

public actor HeartifyClient {
    private let environment: HeartifyEnvironment
    private let transport: HeartifyTransport
    private let store: HeartifyCacheStore
    private let decoder: JSONDecoder

    public init(
        environment: HeartifyEnvironment = .production,
        transport: HeartifyTransport = URLSession.shared,
        store: HeartifyCacheStore = .shared
    ) {
        self.environment = environment
        self.transport = transport
        self.store = store
        self.decoder = JSONDecoder()
    }

    /// Fetches the companion payload. On any failure the last good cached
    /// payload is returned marked `isStale` so complications keep rendering.
    public func snapshot(
        latitude: Double?,
        longitude: Double?,
        method: String = "MWL",
        tzOffsetMinutes: Int = TimeZone.current.secondsFromGMT() / 60,
        accessToken: String? = nil
    ) async -> HeartifySnapshot? {
        do {
            let payload = try await fetch(
                latitude: latitude,
                longitude: longitude,
                method: method,
                tzOffsetMinutes: tzOffsetMinutes,
                accessToken: accessToken
            )
            let snapshot = HeartifySnapshot(payload: payload, fetchedAt: Date(), isStale: false)
            store.save(payload)
            return snapshot
        } catch {
            guard let cached = store.load() else { return nil }
            return HeartifySnapshot(payload: cached.payload, fetchedAt: cached.savedAt, isStale: true)
        }
    }

    public func fetch(
        latitude: Double?,
        longitude: Double?,
        method: String = "MWL",
        tzOffsetMinutes: Int = TimeZone.current.secondsFromGMT() / 60,
        accessToken: String? = nil
    ) async throws -> WatchCompanionPayload {
        var components = URLComponents(
            url: environment.functionsBaseURL.appendingPathComponent("watch-companion"),
            resolvingAgainstBaseURL: false
        )!
        var query: [URLQueryItem] = [
            URLQueryItem(name: "method", value: method),
            URLQueryItem(name: "tz_offset", value: String(tzOffsetMinutes)),
        ]
        if let latitude, let longitude {
            query.append(URLQueryItem(name: "lat", value: String(latitude)))
            query.append(URLQueryItem(name: "lng", value: String(longitude)))
        }
        components.queryItems = query

        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        request.timeoutInterval = 12
        request.setValue(environment.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken ?? environment.anonKey)", forHTTPHeaderField: "Authorization")

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await transport.data(for: request)
        } catch {
            throw HeartifyClientError.transport(String(describing: error))
        }
        if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            throw HeartifyClientError.badStatus(http.statusCode)
        }
        do {
            return try decoder.decode(WatchCompanionPayload.self, from: data)
        } catch {
            throw HeartifyClientError.decoding(String(describing: error))
        }
    }
}

/// Cache shared by the watch app and its widget extension via an App Group.
/// Complications get budgeted refreshes only, so the last good payload must
/// survive process death.
public final class HeartifyCacheStore: @unchecked Sendable {
    public struct Cached: Sendable {
        public let payload: WatchCompanionPayload
        public let savedAt: Date
    }

    public static let shared = HeartifyCacheStore(appGroup: "group.com.heartifyapp.shared")

    private let defaults: UserDefaults
    private let key = "watch.companion.payload.v1"
    private let stampKey = "watch.companion.savedAt.v1"

    public init(appGroup: String?) {
        if let appGroup, let shared = UserDefaults(suiteName: appGroup) {
            self.defaults = shared
        } else {
            self.defaults = .standard
        }
    }

    public func save(_ payload: WatchCompanionPayload) {
        guard let data = try? JSONEncoder().encode(payload) else { return }
        defaults.set(data, forKey: key)
        defaults.set(Date().timeIntervalSince1970, forKey: stampKey)
    }

    public func load() -> Cached? {
        guard let data = defaults.data(forKey: key),
              let payload = try? JSONDecoder().decode(WatchCompanionPayload.self, from: data)
        else { return nil }
        let stamp = defaults.double(forKey: stampKey)
        return Cached(payload: payload, savedAt: Date(timeIntervalSince1970: stamp))
    }

    public func clear() {
        defaults.removeObject(forKey: key)
        defaults.removeObject(forKey: stampKey)
    }
}

/// Access token handoff from the phone app (WatchConnectivity writes it here).
/// Stored in the App Group, never logged.
public enum HeartifySession {
    private static let key = "watch.session.accessToken.v1"

    public static func store(_ token: String?, appGroup: String? = "group.com.heartifyapp.shared") {
        let defaults = appGroup.flatMap { UserDefaults(suiteName: $0) } ?? .standard
        if let token, !token.isEmpty {
            defaults.set(token, forKey: key)
        } else {
            defaults.removeObject(forKey: key)
        }
    }

    public static func token(appGroup: String? = "group.com.heartifyapp.shared") -> String? {
        let defaults = appGroup.flatMap { UserDefaults(suiteName: $0) } ?? .standard
        let value = defaults.string(forKey: key)
        return (value?.isEmpty ?? true) ? nil : value
    }
}
