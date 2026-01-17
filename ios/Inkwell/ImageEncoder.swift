import UIKit

enum ImageEncoder {
    static func jpegData(from image: UIImage, compressionQuality: CGFloat = 0.85) -> Data? {
        image.jpegData(compressionQuality: compressionQuality)
    }
}
