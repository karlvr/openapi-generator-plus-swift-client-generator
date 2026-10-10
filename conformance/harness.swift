/*
 * The scaffold that every driver of the swift-client family builds on: announce
 * a case, make a call, and write the report.
 *
 * The suite copies this file into the generated package next to the entry file
 * of the suite that it runs. It depends only on the support types that every
 * generated package holds, so one copy serves every suite.
 *
 * The generated package must be named TestModule, because Swift can't import a
 * module by a name that it reads at run time.
 */

import Foundation
import TestModule

#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/**
 * Announces cases to the recording server, records what each call produced, and
 * writes the report when the suite ends.
 *
 * Make one from the command line arguments, then call `startCase(_:)` before the
 * calls of each case, and `finish()` after the last case.
 */
@MainActor
final class ConformanceHarness {

    /// The base URL of the recording server.
    let baseUrl: String
    private let resultsPath: String

    private var results: [[String: Any]] = []

    /// The base URL and the results path, from the command line.
    init(arguments: [String] = CommandLine.arguments) {
        baseUrl = arguments[1]
        resultsPath = arguments[2]
    }

    /// Tell the server which case is starting, so it records and answers for that case.
    func startCase(_ id: String) async {
        results.append(["id": id, "calls": [[String: Any]]()])

        var request = URLRequest(url: URL(string: "\(baseUrl)/__conformance/case")!)
        request.httpMethod = "POST"
        request.httpBody = Data(id.utf8)
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            URLSession.shared.dataTask(with: request) { _, _, _ in
                continuation.resume()
            }.resume()
        }
    }

    /**
     * Make one call, and record the status and the value of the result case that
     * the client produced.
     *
     * A generated operation returns an enum with a case for each documented
     * status, named `_` and the status code, and carrying the decoded body.
     */
    func call<Result: Sendable>(_ operation: () async throws -> Result) async {
        await call(operation, reading: { Self.valueOf($0) })
    }

    /**
     * Make one call, and record the status of the result case, with the value
     * that `reading` makes of the result.
     *
     * Use this where a case asks for a report that the decoded body alone can't
     * give, such as whether a property is null or absent.
     */
    func call<Result: Sendable>(_ operation: () async throws -> Result, reading: (Result) throws -> (any Encodable)?) async {
        await record {
            let result = try await operation()
            guard let status = Self.statusOf(result) else {
                throw HarnessError.unknownResultCase(String(describing: result))
            }
            var call: [String: Any] = ["outcome": status >= 400 ? "error" : "success", "httpStatus": status]
            if let value = try reading(result) {
                call["value"] = try Self.json(value)
            }
            return call
        }
    }

    /**
     * Make one call, and record the value that `reading` makes of the result,
     * whatever the status that the result carries.
     *
     * Use this where a case asks what a caller can read from a failure response.
     * `call(_:reading:)` reports a failure status as an error.
     */
    func callReading<Result: Sendable>(_ operation: () async throws -> Result, reading: (Result) throws -> (any Encodable)?) async {
        await record {
            var call: [String: Any] = ["outcome": "success"]
            if let value = try reading(try await operation()) {
                call["value"] = try Self.json(value)
            }
            return call
        }
    }

    /// Record the call that `body` reports, or how it failed.
    private func record(_ body: () async throws -> [String: Any]) async {
        var call: [String: Any] = [:]
        do {
            call = try await body()
        } catch let error as APIError {
            if case let .unexpectedResponse(response, _) = error, let response = response as? HTTPURLResponse {
                /* The client reports an undocumented status as an error that carries the response */
                call["outcome"] = "error"
                call["httpStatus"] = response.statusCode
            } else {
                call["outcome"] = "exception"
                call["error"] = String(describing: error)
            }
        } catch {
            call["outcome"] = "exception"
            call["error"] = String(describing: error)
        }

        var current = results.removeLast()
        current["calls"] = (current["calls"] as! [[String: Any]]) + [call]
        results.append(current)
    }

    /// Write the report of every case that ran.
    func finish() throws {
        let data = try JSONSerialization.data(withJSONObject: ["cases": results], options: [.prettyPrinted, .sortedKeys])
        try data.write(to: URL(fileURLWithPath: resultsPath))
    }

    /// The status code that a result case names, such as 200 for `_200`.
    private static func statusOf(_ result: Any) -> Int? {
        let name = Mirror(reflecting: result).children.first?.label ?? String(describing: result)
        guard name.hasPrefix("_") else {
            return nil
        }
        return Int(name.dropFirst())
    }

    /// The value that a result case carries, if it carries one.
    private static func valueOf(_ result: Any) -> (any Encodable)? {
        guard let value = Mirror(reflecting: result).children.first?.value else {
            return nil
        }
        return value as? any Encodable
    }

    /// `value` as a JSON object, through the same encoder that the client uses.
    private static func json(_ value: any Encodable) throws -> Any {
        let data = try JSONEncoder().encode(value)
        return try JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed])
    }

    private enum HarnessError: Error {
        case unknownResultCase(_ description: String)
    }
}
