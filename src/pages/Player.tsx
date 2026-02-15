import {useMemo} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {Spinner} from "@heroui/react";
import {useMetadata, useChildren} from "../hooks/usePlex.ts";
import VideoPlayer from "../components/player/VideoPlayer.tsx";

export default function Player() {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {data: item, isLoading} = useMetadata(id || "");

    const isEpisode = item?.type === "episode";
    const {data: episodes} = useChildren(isEpisode ? (item?.parentRatingKey || "") : "");

    const {hasNext, hasPrevious, onNext, onPrevious} = useMemo(() => {
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
                ? () => navigate(`/player/${episodes[idx - 1].ratingKey}`, {replace: true})
                : undefined,
            onNext: idx < episodes.length - 1
                ? () => navigate(`/player/${episodes[idx + 1].ratingKey}`, {replace: true})
                : undefined,
        };
    }, [episodes, item, navigate, isEpisode]);

    if (isLoading) {
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
            episodes={episodes}
        />
    );
}
