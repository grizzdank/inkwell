import Foundation

struct ProcessResponse: Decodable {
    let success: Bool
    let transcription: TranscriptionPayload?
    let analysis: AnalysisPayload?
    let error: String?
    let details: String?
}

struct TranscriptionPayload: Decodable {
    let text: String
    let metadata: [String: String]?
    let markdown: String
    let provider: String
}

struct AnalysisPayload: Decodable {
    let insights: String
    let provider: String
}
