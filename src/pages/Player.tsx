import {useEffect, useMemo, useRef} from "react";
import {useNavigate, useParams, useSearchParams} from "react-router-dom";
import {Spinner} from "@heroui/react";
import {useMetadata, useChildren, useAllEpisodes} from "../hooks/usePlex.ts";
import {usePlayer} from "../providers/PlayerProvider.tsx";
import type {PlexMediaItem} from "../lib/types.ts";
import VideoPlayer from "../components/player/VideoPlayer.tsx";

export default function Player() {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const from = searchParams.get("from");
    const {data, isLoading} = useMetadata(id || "");

    const {
        isQueueActive, queue, queueIndex,
        advanceQueue, retreatQueue, syncQueueIndex,
    } = usePlayer();

    // Keep last valid item so VideoPlayer stays mounted during episode transitions
    const lastItemRef = useRef<PlexMediaItem | null>(null);
    if (data) lastItemRef.current = data;
    const item = data ?? lastItemRef.current;

    // Sync queue index when the player item changes
    useEffect(() => {
        if (isQueueActive && item) {
            syncQueueIndex(item.ratingKey);
        }
    }, [isQueueActive, item?.ratingKey, syncQueueIndex]);

    const isEpisode = item?.type === "episode";
    // Current season episodes for next/prev navigation
    const {data: seasonEpisodes} = useChildren(isEpisode && !isQueueActive ? (item?.parentRatingKey || "") : "");
    // All episodes across all seasons for the queue panel
    const {data: allEpisodes} = useAllEpisodes(isEpisode && !isQueueActive ? (item?.grandparentRatingKey || "") : "");

    const fromParam = from ? `?from=${encodeURIComponent(from)}` : "";

    // Queue-based navigation
    const queueNav = useMemo(() => {
        if (!isQueueActive) return null;
        return {
            hasNext: queueIndex < queue.length - 1,
            hasPrevious: queueIndex > 0,
            onNext: queueIndex < queue.length - 1
                ? () => {
                    const next = advanceQueue();
                    if (next) navigate(`/player/${next.ratingKey}${fromParam}`, {replace: true});
                }
                : undefined,
            onPrevious: queueIndex > 0
                ? () => {
                    const prev = retreatQueue();
                    if (prev) navigate(`/player/${prev.ratingKey}${fromParam}`, {replace: true});
                }
                : undefined,
        };
    }, [isQueueActive, queue.length, queueIndex, advanceQueue, retreatQueue, navigate, fromParam]);

    // Episode-based navigation (original behavior)
    const episodeNav = useMemo(() => {
        const episodes = allEpisodes || seasonEpisodes;
        if (!isEpisode || !episodes || !item) {
            return {hasNext: false, hasPrevious: false, onNext: undefined, onPrevious: undefined};
        }
        const idx = episodes.findIndex(ep => ep.ratingKey === item.ratingKey);
        if (idx < 0) {
            return {hasNext: false, hasPrevious: false, onNext: undefined, onPrevious: undefined};
        }
        return {
            hasPrevious: idx > 0,
            hasNext: idx < episodes.length - 1,
            onPrevious: idx > 0
                ? () => navigate(`/player/${episodes[idx - 1].ratingKey}${fromParam}`, {replace: true})
                : undefined,
            onNext: idx < episodes.length - 1
                ? () => navigate(`/player/${episodes[idx + 1].ratingKey}${fromParam}`, {replace: true})
                : undefined,
        };
    }, [allEpisodes, seasonEpisodes, item, navigate, isEpisode, fromParam]);

    const {hasNext, hasPrevious, onNext, onPrevious} = queueNav ?? episodeNav;

    if (isLoading && !item) {
        return (
            <div className="flex justify-center items-center h-screen bg-black">
                <Spinner size="lg" color="white"/>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="flex justify-center items-center h-screen bg-black text-white">
                Media not found
            </div>
        );
    }

    return (
        <VideoPlayer
            item={item}
            onNext={onNext}
            onPrevious={onPrevious}
            hasNext={hasNext}
            hasPrevious={hasPrevious}
            episodes={allEpisodes || seasonEpisodes}
        />
    );
}
