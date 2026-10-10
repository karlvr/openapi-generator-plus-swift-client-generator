import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { RootContext } from '../types'

/** The response to an API request, before it's been parsed into an operation's result. */
export function apiResponse(root: RootContext): string {
	return ts`
//
//  ${generatedBy(root)}
//

import Foundation

/// The response to an API request.
public struct APIResponse: Swift.Sendable {

    public let response: Foundation.HTTPURLResponse
    public let data: Foundation.Data

    public init(response: Foundation.HTTPURLResponse, data: Foundation.Data) {
        self.response = response
        self.data = data
    }

    /**
     Check that the response declares a media type that matches \`mediaType\`, before its body is parsed.

     A server that doesn't say what the body holds, or says that it holds something else, broke the
     contract of the operation, so the client doesn't guess. \`mediaType\` may have a wildcard type or
     subtype. Parameters, such as a charset, are ignored.

     - Throws: \`APIError.invalidResponse\` with an \`UnexpectedContentTypeError\` when the media type doesn't match.
     */
    public func checkContentType(_ mediaType: Swift.String) throws {
        let actual = response.value(forHTTPHeaderField: "Content-Type")
        if let actual = actual, Self.mimeType(actual, matches: mediaType) {
            return
        }
        throw APIError.invalidResponse(UnexpectedContentTypeError(expected: mediaType, actual: actual), response: response, data: data)
    }

    /// Whether the MIME type of the \`actual\` media type matches the MIME type of \`expected\`, which may be a wildcard.
    private static func mimeType(_ actual: Swift.String, matches expected: Swift.String) -> Swift.Bool {
        func mimeType(_ mediaType: Swift.String) -> [Swift.Substring] {
            let mimeType = mediaType.split(separator: ";", maxSplits: 1, omittingEmptySubsequences: false)[0]
            return mimeType.lowercased().trimmingCharacters(in: .whitespaces).split(separator: "/", maxSplits: 1).map { Swift.Substring($0) }
        }
        let actualParts = mimeType(actual)
        let expectedParts = mimeType(expected)
        guard actualParts.count == 2, expectedParts.count == 2 else {
            return false
        }
        return (expectedParts[0] == "*" || expectedParts[0] == actualParts[0]) && (expectedParts[1] == "*" || expectedParts[1] == actualParts[1])
    }
}

extension APIResponse {

    /// The value of the header \`name\`, read by \`parse\`, or \`nil\` when the response doesn't carry it.
    ///
    /// - Throws: \`APIError.invalidResponse\` with a \`ResponseHeaderError\` when \`parse\` can't read the value.
    func header<T>(_ name: Swift.String, _ parse: (Swift.String) -> T?) throws -> T? {
        guard let text = response.value(forHTTPHeaderField: name) else {
            return nil
        }
        return try value(of: name, text, parse)
    }

    /// The value of the header \`name\`, read by \`parse\`.
    ///
    /// - Throws: \`APIError.invalidResponse\` with a \`ResponseHeaderError\` when the response doesn't carry the
    ///   header, or when \`parse\` can't read the value.
    func requiredHeader<T>(_ name: Swift.String, _ parse: (Swift.String) -> T?) throws -> T {
        guard let value = try header(name, parse) else {
            throw APIError.invalidResponse(ResponseHeaderError.missing(name), response: response, data: data)
        }
        return value
    }

    /// The elements of the list header \`name\`, each read by \`parse\`, or \`nil\` when the response doesn't carry it.
    ///
    /// The elements are separated by commas, which may have whitespace around them. A response that carries
    /// the header on more than one line gives the elements of every line.
    ///
    /// - Throws: \`APIError.invalidResponse\` with a \`ResponseHeaderError\` when \`parse\` can't read an element.
    func headerList<T>(_ name: Swift.String, _ parse: (Swift.String) -> T?) throws -> [T]? {
        guard let text = response.value(forHTTPHeaderField: name) else {
            return nil
        }
        let trimmed = text.trimmingCharacters(in: .whitespaces)
        if trimmed.isEmpty {
            return []
        }
        return try trimmed.split(separator: ",", omittingEmptySubsequences: false).map {
            try value(of: name, $0.trimmingCharacters(in: .whitespaces), parse)
        }
    }

    /// The elements of the list header \`name\`, each read by \`parse\`.
    ///
    /// - Throws: \`APIError.invalidResponse\` with a \`ResponseHeaderError\` when the response doesn't carry the
    ///   header, or when \`parse\` can't read an element.
    func requiredHeaderList<T>(_ name: Swift.String, _ parse: (Swift.String) -> T?) throws -> [T] {
        guard let values = try headerList(name, parse) else {
            throw APIError.invalidResponse(ResponseHeaderError.missing(name), response: response, data: data)
        }
        return values
    }

    private func value<T>(of name: Swift.String, _ text: Swift.String, _ parse: (Swift.String) -> T?) throws -> T {
        guard let value = parse(text) else {
            throw APIError.invalidResponse(ResponseHeaderError.unreadable(name, value: text), response: response, data: data)
        }
        return value
    }
}

/// The error in \`APIError.invalidResponse\` when a response header that the API declares can't be read.
public enum ResponseHeaderError: Swift.Error, Swift.Sendable {
    /// The response doesn't carry a header that the API requires.
    case missing(_ name: Swift.String)
    /// The response carries a header whose value doesn't parse as the type that the API gives it.
    case unreadable(_ name: Swift.String, value: Swift.String)
}

/// The error in \`APIError.invalidResponse\` when a response doesn't declare the media type that the operation expects.
public struct UnexpectedContentTypeError: Swift.Error, Swift.Sendable {
    /// The media type that the operation declares.
    public let expected: Swift.String
    /// The media type that the response declared, or \`nil\` when it declared none.
    public let actual: Swift.String?
}

@available(*, deprecated, renamed: "APIResponse")
public typealias URLSessionResponse = APIResponse
`
}
