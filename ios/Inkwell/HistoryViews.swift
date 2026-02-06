import SwiftUI

struct HistoryListView: View {
    @ObservedObject var store: HistoryStore

    var body: some View {
        List {
            ForEach(store.entries) { entry in
                NavigationLink {
                    HistoryDetailView(entry: entry)
                } label: {
                    HStack(spacing: 12) {
                        thumbnailView(for: entry)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(entry.title)
                                .font(.headline)
                                .lineLimit(1)
                            Text(entry.createdAt, style: .date)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .onDelete(perform: store.delete)
        }
        .navigationTitle("History")
    }

    @ViewBuilder
    private func thumbnailView(for entry: HistoryEntry) -> some View {
        if let data = entry.thumbnailData, let image = UIImage(data: data) {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .frame(width: 56, height: 56)
                .clipped()
                .cornerRadius(8)
        } else {
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.secondary.opacity(0.2))
                .frame(width: 56, height: 56)
        }
    }
}

struct HistoryDetailView: View {
    let entry: HistoryEntry

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                SectionHeader(title: "Transcription")
                MarkdownText(entry.transcriptionMarkdown)

                if let analysis = entry.analysisText, !analysis.isEmpty {
                    SectionHeader(title: "Analysis")
                    MarkdownText(analysis)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(24)
        }
        .navigationTitle(entry.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}
