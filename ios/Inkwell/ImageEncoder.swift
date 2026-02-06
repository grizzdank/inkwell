import UIKit

enum ImageEncoder {
    static func jpegData(from image: UIImage, compressionQuality: CGFloat = 0.85) -> Data? {
        image.jpegData(compressionQuality: compressionQuality)
    }

    static func thumbnailData(from image: UIImage,
                              maxDimension: CGFloat = 240,
                              compressionQuality: CGFloat = 0.7) -> Data? {
        let size = image.size
        let maxSide = max(size.width, size.height)
        guard maxSide > 0 else { return nil }

        let scale = min(1, maxDimension / maxSide)
        let targetSize = CGSize(width: size.width * scale, height: size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }
        return resized.jpegData(compressionQuality: compressionQuality)
    }
}
