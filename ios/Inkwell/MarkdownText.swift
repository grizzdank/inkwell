import SwiftUI

struct MarkdownText: View {
    let text: String
    let font: Font

    init(_ text: String, font: Font = .system(.body, design: .serif)) {
        self.text = text
        self.font = font
    }

    var body: some View {
        if let attributed = try? AttributedString(markdown: text) {
            Text(attributed)
                .font(font)
                .textSelection(.enabled)
        } else {
            Text(text)
                .font(font)
                .textSelection(.enabled)
        }
    }
}
