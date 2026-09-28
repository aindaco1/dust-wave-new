import AVFoundation
import Foundation

// AVFoundation passthrough retains Apple's auxiliary HEVC alpha metadata,
// which a generic MOV remux can discard even when video packets are copied.
@main
struct MuxTransitionAudio {
    static func main() async throws {
        let args = CommandLine.arguments
        guard args.count == 4 else { fatalError("Usage: mux VIDEO AUDIO OUTPUT") }
        let video = AVURLAsset(url: URL(fileURLWithPath: args[1]))
        let audio = AVURLAsset(url: URL(fileURLWithPath: args[2]))
        let composition = AVMutableComposition()
        let duration = try await video.load(.duration)
        guard let sourceVideo = try await video.loadTracks(withMediaType: .video).first,
              let sourceAudio = try await audio.loadTracks(withMediaType: .audio).first,
              let videoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
              let audioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
        else { fatalError("Missing video or audio track") }
        try videoTrack.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: sourceVideo, at: .zero)
        videoTrack.preferredTransform = try await sourceVideo.load(.preferredTransform)
        let audioDuration = try await audio.load(.duration)
        try audioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: CMTimeMinimum(duration, audioDuration)), of: sourceAudio, at: .zero)
        guard let export = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetPassthrough)
        else { fatalError("Passthrough export unavailable") }
        export.shouldOptimizeForNetworkUse = true
        let destination = URL(fileURLWithPath: args[3])
        try? FileManager.default.removeItem(at: destination)
        try await export.export(to: destination, as: destination.pathExtension == "mov" ? .mov : .mp4)
    }
}
