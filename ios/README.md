# iOS App Setup

This folder uses XcodeGen to generate the Xcode project.

## Generate the project

1) Install XcodeGen (once):

```bash
brew install xcodegen
```

2) Generate the Xcode project:

```bash
cd ios
xcodegen
```

3) Open `Inkwell.xcodeproj` in Xcode.

## Local backend

- Simulator: `http://localhost:3847`
- Device (Tailscale): use your Mac's Tailscale IP in Settings.
