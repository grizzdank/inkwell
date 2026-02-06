import SwiftUI

struct ResultView: View {
    let response: ProcessResponse

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let transcription = response.transcription {
                SectionHeader(title: "Transcription")
                MarkdownText(transcription.markdown)
            }

            if let analysis = response.analysis {
                SectionHeader(title: "Analysis")
                MarkdownText(analysis.insights)
            }

            if let error = response.error {
                SectionHeader(title: "Error")
                Text(error)
                    .foregroundStyle(.red)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview {
    ResultView(response: ProcessResponse(success: true,
                                         transcription: TranscriptionPayload(text: "Text",
                                                                             metadata: ["date": "2025-01-01"],
                                                                             markdown: "Sample markdown",
                                                                             provider: "gemini"),
                                         analysis: AnalysisPayload(insights: "Analysis text",
                                                                   provider: "anthropic"),
                                         error: nil,
                                         details: nil))
        .padding()
}
