import SwiftUI

struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.system(.headline, design: .serif))
            .padding(.bottom, 4)
    }
}
