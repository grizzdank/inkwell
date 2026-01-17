import Foundation
import UIKit

struct APIClient {
    let baseURL: URL

    init(baseURLString: String) {
        self.baseURL = URL(string: baseURLString) ?? URL(string: AppConfig.defaultBaseURL)!
    }

    func process(image: UIImage, mediaType: String = "image/jpeg", analyze: Bool = true) async throws -> ProcessResponse {
        guard let imageData = ImageEncoder.jpegData(from: image) else {
            throw APIError.encodingFailed
        }

        let payload: [String: Any] = [
            "image": imageData.base64EncodedString(),
            "mediaType": mediaType,
            "analyze": analyze
        ]

        let responseData = try await request(path: "/process", payload: payload)
        return try JSONDecoder().decode(ProcessResponse.self, from: responseData)
    }

    private func request(path: String, payload: [String: Any]) async throws -> Data {
        let url = baseURL.appendingPathComponent(path)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = AppConfig.apiTimeoutSeconds
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode >= 400 {
            throw APIError.httpStatus(http.statusCode, body: String(data: data, encoding: .utf8))
        }
        return data
    }
}

enum APIError: Error, LocalizedError {
    case encodingFailed
    case httpStatus(Int, body: String?)

    var errorDescription: String? {
        switch self {
        case .encodingFailed:
            return "Image encoding failed."
        case .httpStatus(let status, let body):
            if let body, !body.isEmpty {
                return "Server error \(status): \(body)"
            }
            return "Server error \(status)."
        }
    }
}
