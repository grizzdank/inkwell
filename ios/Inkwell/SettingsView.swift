import SwiftUI

struct SettingsView: View {
    @AppStorage("apiBaseURL") private var apiBaseURL = AppConfig.defaultBaseURL
    @AppStorage("analyzeEnabled") private var analyzeEnabled = AppConfig.defaultAnalyzeEnabled

    var body: some View {
        Form {
            Section(header: Text("Backend")) {
                TextField("API Base URL", text: $apiBaseURL)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.URL)
            }

            Section(header: Text("Analysis")) {
                Toggle("Run analysis", isOn: $analyzeEnabled)
            }

            Section(header: Text("iCloud")) {
                Text("Container: \(AppConfig.iCloudContainerIdentifier)")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Settings")
    }
}

#Preview {
    SettingsView()
}
