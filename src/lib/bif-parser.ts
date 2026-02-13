import type { BifData, BifIndex } from "./types";

const BIF_MAGIC = 0x89424946;

export function parseBif(buffer: ArrayBuffer): BifData | null {
    if (buffer.byteLength < 64) return null;

    const view = new DataView(buffer);
    const magic = view.getUint32(0, false);
    if (magic !== BIF_MAGIC) return null;

    const version = view.getUint32(8, true);
    const imageCount = view.getUint32(12, true);
    const timestampMultiplier = view.getUint32(16, true) || 1000;

    const indexStart = 64;
    const images: BifIndex[] = [];

    for (let i = 0; i < imageCount; i++) {
        const entryOffset = indexStart + i * 8;
        if (entryOffset + 12 > buffer.byteLength) break;

        const timestamp = view.getUint32(entryOffset, true);
        const offset = view.getUint32(entryOffset + 4, true);
        const nextOffset = view.getUint32(entryOffset + 8 + 4, true);
        const size = nextOffset - offset;

        images.push({
            timestampMs: timestamp * timestampMultiplier,
            offset,
            size,
        });
    }

    return { version, imageCount, timestampMultiplier, images, buffer };
}

export function getBifImageAtTime(bif: BifData, timeMs: number): Blob | null {
    if (bif.images.length === 0) return null;

    let lo = 0;
    let hi = bif.images.length - 1;
    let best = 0;

    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        if (bif.images[mid].timestampMs <= timeMs) {
            best = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }

    const entry = bif.images[best];
    if (!entry || entry.size <= 0) return null;
    if (entry.offset + entry.size > bif.buffer.byteLength) return null;

    const slice = bif.buffer.slice(entry.offset, entry.offset + entry.size);
    return new Blob([slice], { type: "image/jpeg" });
}
