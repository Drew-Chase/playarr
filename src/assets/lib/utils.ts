/**
 * Format milliseconds to a human-readable duration string (e.g., "1h 23m")
 */
export function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
}

/**
 * Format milliseconds to a player timestamp (e.g., "1:23:45")
 */
export function formatTimestamp(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, "0");

    if (hours > 0) {
        return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${minutes}:${pad(seconds)}`;
}

/**
 * Format bytes to a human-readable file size (e.g., "1.5 GB")
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Format bytes/second to a human-readable speed (e.g., "5.2 MB/s")
 */
export function formatSpeed(bytesPerSecond: number): string {
    return `${formatFileSize(bytesPerSecond)}/s`;
}

/**
 * Get the Plex image URL for a thumbnail/art path
 */
export function plexImage(path: string | undefined, width = 300, height = 450): string {
    if (!path) return "";
    return `/api/media/image?path=${encodeURIComponent(path)}&width=${width}&height=${height}`;
}

/**
 * Get TMDB image URL
 */
export function tmdbImage(path: string | null, size = "w500"): string {
    if (!path) return "";
    return `https://image.tmdb.org/t/p/${size}${path}`;
}

/**
 * Get display title for a media item, handling episodes with show/season info
 */
export function getDisplayTitle(item: {
    title: string;
    type: string;
    grandparentTitle?: string;
    parentIndex?: number;
    index?: number;
}): string {
    if (item.type === "episode" && item.grandparentTitle) {
        return `${item.grandparentTitle} - S${item.parentIndex?.toString().padStart(2, "0")}E${item.index?.toString().padStart(2, "0")} - ${item.title}`;
    }
    return item.title;
}
