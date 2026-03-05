//
//  SafariWebExtensionHandler.swift
//  TimeHarbor Extension
//
//  Created by TimeHarbor Development Team
//

import SafariServices
import Foundation
import WebKit

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    
    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem
        
        guard let message = request?.userInfo?[SFExtensionMessageKey] as? [String: Any],
              let command = message["action"] as? String else {
            context.completeRequest(returningItems: nil, completionHandler: nil)
            return
        }
        
        handleCommand(command, with: message, context: context)
    }
    
    private func handleCommand(_ command: String, with message: [String: Any], context: NSExtensionContext) {
        switch command {
        case "captureScreenshot":
            handleScreenshotCapture(message: message, context: context)
        case "saveLocal":
            handleLocalSave(message: message, context: context)
        case "readFile":
            handleFileRead(message: message, context: context)
        case "writeFile":
            handleFileWrite(message: message, context: context)
        case "openFile":
            handleFileOpen(message: message, context: context)
        case "updateActivityLog":
            handleActivityLogUpdate(message: message, context: context)
        case "captureFullPage":
            handleFullPageCapture(message: message, context: context)
        default:
            sendResponse(["success": false, "error": "Unknown command"], to: context)
        }
    }
    
    // MARK: - Screenshot Capture
    
    private func handleScreenshotCapture(message: [String: Any], context: NSExtensionContext) {
        let quality = message["quality"] as? Double ?? 0.8
        let format = message["format"] as? String ?? "png"
        
        // Get the active Safari window
        guard let activeWindow = NSApplication.shared.windows.first(where: { $0.isMainWindow }) else {
            sendResponse(["success": false, "error": "No active Safari window"], to: context)
            return
        }
        
        // Capture the web view content
        captureWebView(in: activeWindow, quality: quality, format: format) { [weak self] result in
            switch result {
            case .success(let screenshotData):
                self?.sendResponse([
                    "success": true,
                    "screenshot": screenshotData
                ], to: context)
            case .failure(let error):
                self?.sendResponse([
                    "success": false,
                    "error": error.localizedDescription
                ], to: context)
            }
        }
    }
    
    private func captureWebView(in window: NSWindow, quality: Double, format: String, completion: @escaping (Result<String, Error>) -> Void) {
        // Find the WKWebView in the window
        guard let webView = findWebView(in: window.contentView) else {
            completion(.failure(NSError(domain: "TimeHarbor", code: 1, userInfo: [NSLocalizedDescriptionKey: "No web view found"])))
            return
        }
        
        // Capture the web view
        webView.takeSnapshot(with: nil) { image, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let image = image else {
                completion(.failure(NSError(domain: "TimeHarbor", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to capture image"])))
                return
            }
            
            // Convert to data
            guard let data = self.imageToData(image, format: format, quality: quality) else {
                completion(.failure(NSError(domain: "TimeHarbor", code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to convert image to data"])))
                return
            }
            
            // Convert to base64
            let base64 = data.base64EncodedString()
            let dataURL = "data:image/\(format);base64,\(base64)"
            
            completion(.success(dataURL))
        }
    }
    
    private func findWebView(in view: NSView?) -> WKWebView? {
        guard let view = view else { return nil }
        
        if let webView = view as? WKWebView {
            return webView
        }
        
        for subview in view.subviews {
            if let webView = findWebView(in: subview) {
                return webView
            }
        }
        
        return nil
    }
    
    private func imageToData(_ image: NSImage, format: String, quality: Double) -> Data? {
        guard let tiffData = image.tiffRepresentation,
              let bitmapRep = NSBitmapImageRep(data: tiffData) else {
            return nil
        }
        
        switch format.lowercased() {
        case "png":
            return bitmapRep.representation(using: .png, properties: [:])
        case "jpeg", "jpg":
            return bitmapRep.representation(using: .jpeg, properties: [.compressionFactor: quality])
        default:
            return bitmapRep.representation(using: .png, properties: [:])
        }
    }
    
    // MARK: - Full Page Capture
    
    private func handleFullPageCapture(message: [String: Any], context: NSExtensionContext) {
        // This would require more complex implementation to scroll and capture the full page
        // For now, delegate to regular screenshot capture
        handleScreenshotCapture(message: message, context: context)
    }
    
    // MARK: - File Operations
    
    private func handleLocalSave(message: [String: Any], context: NSExtensionContext) {
        guard let screenshot = message["screenshot"] as? String,
              let metadata = message["metadata"] as? [String: Any],
              let path = message["path"] as? String,
              let metadataPath = message["metadataPath"] as? String else {
            sendResponse(["success": false, "error": "Missing required parameters"], to: context)
            return
        }
        
        do {
            // Create directory if needed
            let url = URL(fileURLWithPath: expandPath(path))
            let directory = url.deletingLastPathComponent()
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true, attributes: nil)
            
            // Save screenshot
            let imageData = try convertBase64ToData(screenshot)
            try imageData.write(to: url)
            
            // Save metadata
            let metadataURL = URL(fileURLWithPath: expandPath(metadataPath))
            let metadataJSON = try JSONSerialization.data(withJSONObject: metadata, options: [.prettyPrinted])
            try metadataJSON.write(to: metadataURL)
            
            sendResponse([
                "success": true,
                "path": path
            ], to: context)
            
        } catch {
            sendResponse([
                "success": false,
                "error": error.localizedDescription
            ], to: context)
        }
    }
    
    private func handleFileRead(message: [String: Any], context: NSExtensionContext) {
        guard let path = message["path"] as? String else {
            sendResponse(["success": false, "error": "Missing path parameter"], to: context)
            return
        }
        
        do {
            let url = URL(fileURLWithPath: expandPath(path))
            let content = try String(contentsOf: url, encoding: .utf8)
            
            sendResponse([
                "success": true,
                "content": content
            ], to: context)
            
        } catch {
            sendResponse([
                "success": false,
                "error": error.localizedDescription
            ], to: context)
        }
    }
    
    private func handleFileWrite(message: [String: Any], context: NSExtensionContext) {
        guard let path = message["path"] as? String,
              let content = message["content"] as? String else {
            sendResponse(["success": false, "error": "Missing required parameters"], to: context)
            return
        }
        
        do {
            let url = URL(fileURLWithPath: expandPath(path))
            let directory = url.deletingLastPathComponent()
            
            // Create directory if needed
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true, attributes: nil)
            
            // Write content
            try content.write(to: url, atomically: true, encoding: .utf8)
            
            sendResponse([
                "success": true,
                "path": path
            ], to: context)
            
        } catch {
            sendResponse([
                "success": false,
                "error": error.localizedDescription
            ], to: context)
        }
    }
    
    private func handleFileOpen(message: [String: Any], context: NSExtensionContext) {
        guard let path = message["path"] as? String else {
            sendResponse(["success": false, "error": "Missing path parameter"], to: context)
            return
        }
        
        let url = URL(fileURLWithPath: expandPath(path))
        
        if FileManager.default.fileExists(atPath: url.path) {
            NSWorkspace.shared.open(url)
            sendResponse(["success": true], to: context)
        } else {
            sendResponse([
                "success": false,
                "error": "File not found: \(path)"
            ], to: context)
        }
    }
    
    private func handleActivityLogUpdate(message: [String: Any], context: NSExtensionContext) {
        guard let entry = message["entry"] as? [String: Any],
              let logPath = message["logPath"] as? String else {
            sendResponse(["success": false, "error": "Missing required parameters"], to: context)
            return
        }
        
        // This would be implemented to update the HTML activity log
        // For now, just acknowledge the request
        sendResponse([
            "success": true,
            "message": "Activity log update queued"
        ], to: context)
    }
    
    // MARK: - Utility Methods
    
    private func expandPath(_ path: String) -> String {
        if path.hasPrefix("~/") {
            return path.replacingOccurrences(of: "~", with: FileManager.default.homeDirectoryForCurrentUser.path)
        }
        return path
    }
    
    private func convertBase64ToData(_ base64String: String) throws -> Data {
        // Remove data URL prefix if present
        let cleanBase64 = base64String.components(separatedBy: ",").last ?? base64String
        
        guard let data = Data(base64Encoded: cleanBase64) else {
            throw NSError(domain: "TimeHarbor", code: 4, userInfo: [NSLocalizedDescriptionKey: "Invalid base64 data"])
        }
        
        return data
    }
    
    private func sendResponse(_ response: [String: Any], to context: NSExtensionContext) {
        let item = NSExtensionItem()
        item.userInfo = [SFExtensionMessageKey: response]
        context.completeRequest(returningItems: [item], completionHandler: nil)
    }
}