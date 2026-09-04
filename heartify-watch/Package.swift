// swift-tools-version:5.9
// HeartifyKit — the shared Swift port of src/lib/shared/watch.ts.
//
// The watchOS app target itself lives in the Xcode project (a Swift package
// cannot declare a watchOS app / WidgetKit extension target), but every line
// of logic the watch needs lives here so it is unit-testable on any machine
// with a Swift toolchain, including CI without Xcode.
import PackageDescription

let package = Package(
    name: "HeartifyKit",
    platforms: [.watchOS(.v10), .iOS(.v16), .macOS(.v13)],
    products: [
        .library(name: "HeartifyKit", targets: ["HeartifyKit"])
    ],
    targets: [
        .target(name: "HeartifyKit"),
        .testTarget(name: "HeartifyKitTests", dependencies: ["HeartifyKit"])
    ]
)
