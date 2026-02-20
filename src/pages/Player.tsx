import {useMemo, useRef} from "react";
import {useNavigate, useParams, useSearchParams} from "react-router-dom";
import {Spinner} from "@heroui/react";
import {useMetadata, useChildren, useAllEpisodes} from "../hooks/usePlex.ts";
import type {PlexMediaItem} from "../lib/types.ts";
import VideoPlayer from "../components/player/VideoPlayer.tsx";

export default function Player() {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const from = searchParams.get("from");
    const {data, isLoading} = useMetadata(id || "");

    // Keep last valid item so VideoPlayer stays mounted during episode transitions
    // (prevents volume/quality/muted state from being lost on unmount)
    const lastItemRef = useRef<PlexMediaItem | null>(null);
    if (data) lastItemRef.current = data;
    const item = data ?? lastItemRef.current;

    const isEpisode = item?.type === "episode";
    // Current season episodes for next/prev navigation
    const {data: seasonEpisodes} = useChildren(isEpisode ? (item?.parentRatingKey || "") : "");
    // All episodes across all seasons for the queue panel
    const {data: allEpisodes} = useAllEpisodes(isEpisode ? (item?.grandparentRatingKey || "") : "");

    const {hasNext, hasPrevious, onNext, onPrevious} = useMemo(() => {
        // Use all episodes for navigation so next/prev crosses season boundaries
        const episodes = allEpisodes || seasonEpisodes;
        if (!isEpisode || !episodes || !item) {
            return {hasNext: false, hasPrevious: false, onNext: undefined, onPrevious: undefined};
        }
        const idx = episodes.findIndex(ep => ep.ratingKey === item.ratingKey);
        if (idx < 0) {
            return {hasNext: false, hasPrevious: false, onNext: undefined, onPrevious: undefined};
        }
        const fromParam = from ? `?from=${encodeURIComponent(from)}` : "";
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
    }, [allEpisodes, seasonEpisodes, item, navigate, isEpisode, from]);

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
