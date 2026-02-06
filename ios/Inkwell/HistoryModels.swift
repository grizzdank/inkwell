import Foundation

struct HistoryEntry: Identifiable, Codable {
    let id: UUID
    let createdAt: Date
    let title: String
    let transcriptionMarkdown: String
    let analysisText: String?
    let provider: String?
    let analysisProvider: String?
    let thumbnailData: Data?
    let metadata: [String: String]?
}
