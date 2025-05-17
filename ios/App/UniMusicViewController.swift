import Capacitor
import MusicKit
import UIKit
import UniMusicSync

class UniMusicViewController: CAPBridgeViewController {
    private var keepWebViewAlive: Timer?
    private(set) var uniMusicSync: UniMusicSync?

    deinit {
        keepWebViewAlive?.invalidate()

        if let uniMusicSync {
            Task { try await uniMusicSync.irohManager.shutdown() }
            self.uniMusicSync = nil
        }
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        Task {
            let path = NSTemporaryDirectory()
            uniMusicSync = try! await UniMusicSync(path)
            let author = try! await uniMusicSync!.irohManager.getAuthor()
            print("IROH Author: \(author)")
        }

        // Run Javascript code every 5 seconds to keep WebView alive.
        // This is necessary, since in case user does not interact with WebView in ~20-30s iOS will simply kill it
        // and we obviously need javascript to interact with the app
        keepWebViewAlive = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { _ in
            self.webView?.evaluateJavaScript("!!document.body")
        }
    }

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(MusicKitAuthorizationPlugin())
    }
}
