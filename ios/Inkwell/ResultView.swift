import SwiftUI

struct ResultView: View {
    let response: ProcessResponse

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let transcription = response.transcription {
                SectionHeader(title: "Transcription")
                Text(transcription.markdown)
                    .font(.system(.body, design: .serif))
                    .textSelection(.enabled)
            }

            if let analysis = response.analysis {
                SectionHeader(title: "Analysis")
                Text(analysis.insights)
                    .font(.system(.body, design: .serif))
                    .textSelection(.enabled)
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

private struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.system(.headline, design: .serif))
            .padding(.bottom, 4)
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
