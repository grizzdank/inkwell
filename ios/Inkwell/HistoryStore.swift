import Foundation
import UIKit

@MainActor
final class HistoryStore: ObservableObject {
    @Published private(set) var entries: [HistoryEntry] = []

    private let maxEntries = 50
    private let fileURL: URL

    init() {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        self.fileURL = docs.appendingPathComponent("history.json")
        load()
    }

    func add(response: ProcessResponse, image: UIImage) {
        guard let transcription = response.transcription else { return }

        let thumbnail = ImageEncoder.thumbnailData(from: image)
        let title = Self.buildTitle(from: transcription)
        let entry = HistoryEntry(
            id: UUID(),
            createdAt: Date(),
            title: title,
            transcriptionMarkdown: transcription.markdown,
            analysisText: response.analysis?.insights,
            provider: transcription.provider,
            analysisProvider: response.analysis?.provider,
            thumbnailData: thumbnail,
            metadata: transcription.metadata
        )

        entries.insert(entry, at: 0)
        if entries.count > maxEntries {
            entries = Array(entries.prefix(maxEntries))
        }
        save()
    }

    func delete(at offsets: IndexSet) {
        entries.remove(atOffsets: offsets)
        save()
    }

    private func load() {
        guard let data = try? Data(contentsOf: fileURL) else { return }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        if let decoded = try? decoder.decode([HistoryEntry].self, from: data) {
            entries = decoded
        }
    }

    private func save() {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(entries) else { return }
        try? data.write(to: fileURL, options: [.atomic])
    }

    private static func buildTitle(from transcription: TranscriptionPayload) -> String {
        if let date = transcription.metadata?["date"], !date.isEmpty, date.lowercased() != "unknown" {
            return date
        }

        let firstLine = transcription.markdown
            .split(whereSeparator: \.isNewline)
            .map { String($0) }
            .first { !$0.trimmingCharacters(in: .whitespaces).isEmpty }

        if let firstLine {
            return firstLine
        }
        return "Untitled Entry"
    }
}
