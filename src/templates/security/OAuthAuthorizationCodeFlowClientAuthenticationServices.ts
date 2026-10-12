import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { RootContext } from '../types'

/** A convenience that authorizes an `OAuthAuthorizationCodeFlowClient` in an `ASWebAuthenticationSession`, where AuthenticationServices offers one. */
export function oauthAuthorizationCodeFlowClientAuthenticationServices(root: RootContext): string {
	return ts`
//  
//  ${generatedBy(root)}
//

#if canImport(AuthenticationServices) && !os(tvOS) && !os(watchOS)
import AuthenticationServices
import Foundation

extension OAuthAuthorizationCodeFlowClient {

    /**
     Authorize the client by presenting the authorization server's page in an \`ASWebAuthenticationSession\`, and exchanging the authorization code that it redirects with for an access token.

     The redirect is captured by the session, so the app doesn't need to handle it. A custom scheme redirect URI works on every OS version; an https redirect URI needs iOS 17.4 or macOS 14.4, and an associated domain for its host.

     Cancelling the calling task dismisses the session.
     - Parameters:
       - scopes: The scopes to request, or \`nil\` for the server's default scopes.
       - additionalParameters: Parameters to add to the authorization URL, such as \`prompt\`, \`login_hint\` or \`nonce\`.
       - presentationAnchor: The window to present the session from.
       - prefersEphemeralWebBrowserSession: Whether to keep the session's cookies from the user's browser, so that the user isn't signed in with the browser's session and nothing is left behind.
     - Throws: \`OAuthAuthorizationCodeFlowError.cancelled\` if the user dismisses the session, \`CancellationError\` if the task is cancelled, and the errors of \`authenticate(redirectURL:request:)\`.
     */
    @MainActor
    public func authorize(
        scopes: [String]? = nil,
        additionalParameters: [String: String] = [:],
        presentationAnchor: ASPresentationAnchor,
        prefersEphemeralWebBrowserSession: Bool = false
    ) async throws {
        let request = authorizationRequest(scopes: scopes, additionalParameters: additionalParameters)
        let session = WebAuthenticationSession()
        let callbackURL = try await session.run(
            url: request.url,
            redirectURI: request.redirectURI,
            presentationAnchor: presentationAnchor,
            prefersEphemeralWebBrowserSession: prefersEphemeralWebBrowserSession
        )
        try await authenticate(redirectURL: callbackURL, request: request)
    }

    /// Runs one \`ASWebAuthenticationSession\` and returns the URL it is redirected to.
    @MainActor
    private final class WebAuthenticationSession {
        private var session: ASWebAuthenticationSession?
        private var contextProvider: PresentationContextProvider?
        private var continuation: CheckedContinuation<URL, Swift.Error>?

        func run(url: URL, redirectURI: URL, presentationAnchor: ASPresentationAnchor, prefersEphemeralWebBrowserSession: Bool) async throws -> URL {
            try await withTaskCancellationHandler {
                try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<URL, Swift.Error>) in
                    if Task.isCancelled {
                        continuation.resume(throwing: CancellationError())
                        return
                    }
                    self.start(url: url, redirectURI: redirectURI, presentationAnchor: presentationAnchor, prefersEphemeralWebBrowserSession: prefersEphemeralWebBrowserSession, continuation: continuation)
                }
            } onCancel: {
                Task { @MainActor in
                    self.cancel()
                }
            }
        }

        private func start(url: URL, redirectURI: URL, presentationAnchor: ASPresentationAnchor, prefersEphemeralWebBrowserSession: Bool, continuation: CheckedContinuation<URL, Swift.Error>) {
            self.continuation = continuation

            /* The session may call this on another thread, so it isn't isolated to the main actor */
            let completionHandler: @Sendable (URL?, Swift.Error?) -> Void = { callbackURL, error in
                Task { @MainActor in
                    self.finish(callbackURL: callbackURL, error: error)
                }
            }

            let session: ASWebAuthenticationSession
            if redirectURI.scheme?.lowercased() == "https" {
                guard #available(iOS 17.4, macOS 14.4, visionOS 1.1, *), let host = redirectURI.host else {
                    finish(callbackURL: nil, error: OAuthAuthorizationCodeFlowError.unsupportedRedirectURI(redirectURI))
                    return
                }
                session = ASWebAuthenticationSession(url: url, callback: .https(host: host, path: redirectURI.path.isEmpty ? "/" : redirectURI.path), completionHandler: completionHandler)
            } else if let scheme = redirectURI.scheme {
                session = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme, completionHandler: completionHandler)
            } else {
                finish(callbackURL: nil, error: OAuthAuthorizationCodeFlowError.unsupportedRedirectURI(redirectURI))
                return
            }

            /* The session holds its presentation context provider weakly, so we hold it */
            let contextProvider = PresentationContextProvider(anchor: presentationAnchor)
            session.presentationContextProvider = contextProvider
            session.prefersEphemeralWebBrowserSession = prefersEphemeralWebBrowserSession
            self.contextProvider = contextProvider
            self.session = session

            if !session.start() {
                finish(callbackURL: nil, error: OAuthAuthorizationCodeFlowError.presentationFailed)
            }
        }

        private func cancel() {
            session?.cancel()
            finish(callbackURL: nil, error: CancellationError())
        }

        /// Resume the caller, once only, as the session may report more than once, such as when it is cancelled.
        private func finish(callbackURL: URL?, error: Swift.Error?) {
            guard let continuation = continuation else {
                return
            }
            self.continuation = nil
            session = nil
            contextProvider = nil

            if let error = error {
                if let sessionError = error as? ASWebAuthenticationSessionError, sessionError.code == .canceledLogin {
                    continuation.resume(throwing: OAuthAuthorizationCodeFlowError.cancelled)
                } else {
                    continuation.resume(throwing: error)
                }
            } else if let callbackURL = callbackURL {
                continuation.resume(returning: callbackURL)
            } else {
                continuation.resume(throwing: OAuthAuthorizationCodeFlowError.cancelled)
            }
        }
    }

    private final class PresentationContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
        private let anchor: ASPresentationAnchor

        init(anchor: ASPresentationAnchor) {
            self.anchor = anchor
        }

        func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
            anchor
        }
    }
}
#endif
`
}
