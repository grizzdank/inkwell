import PhotosUI
import SwiftUI

struct ContentView: View {
    @AppStorage("apiBaseURL") private var apiBaseURL = AppConfig.defaultBaseURL

    @State private var selectedItem: PhotosPickerItem?
    @State private var selectedImage: UIImage?
    @State private var isProcessing = false
    @State private var statusMessage: String?
    @State private var processResponse: ProcessResponse?
    @State private var showingSettings = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    header
                    pickerSection
                    actionSection
                    resultSection
                }
                .padding(24)
            }
            .background(Color(red: 0.97, green: 0.95, blue: 0.93))
            .navigationTitle("Inkwell")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Settings") {
                        showingSettings = true
                    }
                }
            }
            .sheet(isPresented: $showingSettings) {
                NavigationStack {
                    SettingsView()
                }
            }
            .onChange(of: selectedItem) { _, newItem in
                guard let newItem else { return }
                Task {
                    await loadImage(from: newItem)
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Analog journal to digital brain")
                .font(.system(.title2, design: .serif))
            Text("Capture a journal page, then let Gemini and Claude do the rest.")
                .font(.system(.body, design: .serif))
                .foregroundStyle(.secondary)
        }
    }

    private var pickerSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            PhotosPicker("Select a journal photo", selection: $selectedItem, matching: .images)
                .buttonStyle(.borderedProminent)

            if let image = selectedImage {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .cornerRadius(12)
                    .shadow(radius: 6, y: 4)
            }
        }
    }

    private var actionSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button(action: processImage) {
                HStack {
                    if isProcessing {
                        ProgressView()
                    }
                    Text(isProcessing ? "Processing..." : "Process with Analysis")
                }
            }
            .buttonStyle(.bordered)
            .disabled(selectedImage == nil || isProcessing)

            if let statusMessage {
                Text(statusMessage)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Text("Backend: \(apiBaseURL)")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    private var resultSection: some View {
        Group {
            if let response = processResponse {
                ResultView(response: response)
            }
        }
    }

    @MainActor
    private func loadImage(from item: PhotosPickerItem) async {
        statusMessage = nil
        processResponse = nil

        do {
            if let data = try await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data) {
                selectedImage = image
            } else {
                statusMessage = "Could not load image data."
            }
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func processImage() {
        guard let image = selectedImage else { return }

        isProcessing = true
        statusMessage = nil
        processResponse = nil

        Task {
            do {
                let client = APIClient(baseURLString: apiBaseURL)
                let response = try await client.process(image: image)
                await MainActor.run {
                    processResponse = response
                    if !response.success {
                        statusMessage = response.error ?? "Processing failed."
                    }
                    isProcessing = false
                }
            } catch {
                await MainActor.run {
                    statusMessage = error.localizedDescription
                    isProcessing = false
                }
            }
        }
    }
}

#Preview {
    ContentView()
}
