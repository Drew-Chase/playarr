const BROWSER_VIDEO_CODECS = new Set([
    "h264", "avc1",
    "vp8",
    "vp9",
    "av1",
]);

const BROWSER_AUDIO_CODECS = new Set([
    "aac",
    "mp3",
    "opus",
    "vorbis",
    "flac",
]);

const BROWSER_CONTAINERS = new Set([
    "mp4", "m4v",
    "webm",
    "ogg",
    "mov",
]);

export type PlayRecommendation = "direct" | "directstream" | "transcode";

export interface DirectPlayability {
    recommendation: PlayRecommendation;
    reason?: string;
}

export function checkDirectPlayability(
    videoCodec: string,
    audioCodec: string,
    container: string,
): DirectPlayability {
    const vc = videoCodec?.toLowerCase() || "";
    const ac = audioCodec?.toLowerCase() || "";
    const ct = container?.toLowerCase() || "";

    const canPlayVideo = BROWSER_VIDEO_CODECS.has(vc);
    const canPlayAudio = BROWSER_AUDIO_CODECS.has(ac);
    const canPlayContainer = BROWSER_CONTAINERS.has(ct);

    if (canPlayVideo && canPlayAudio && canPlayContainer) {
        return { recommendation: "direct" };
    }

    if (canPlayVideo && (!canPlayAudio || !canPlayContainer)) {
        return {
            recommendation: "directstream",
            reason: !canPlayAudio
                ? `Audio codec "${audioCodec}" not supported by browser`
                : `Container "${container}" not supported for direct play`,
        };
    }

    return {
        recommendation: "transcode",
        reason: `Video codec "${videoCodec}" not supported by browser`,
    };
}
