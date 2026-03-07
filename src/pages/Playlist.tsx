import {useNavigate, useParams} from "react-router-dom";
import {Button, Spinner} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {toast} from "sonner";
import {usePlaylistMetadata, usePlaylistItems} from "../hooks/usePlex.ts";
import {plexImage, formatDuration, shuffleArray} from "../lib/utils.ts";
import {usePlayer} from "../providers/PlayerProvider.tsx";
import MediaCard from "../components/media/MediaCard.tsx";

export default function Playlist() {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {addToQueue, clearQueue} = usePlayer();
    const {data: playlist, isLoading: metaLoading} = usePlaylistMetadata(id || "");
    const {data: items, isLoading: itemsLoading} = usePlaylistItems(id || "");

    const handlePlayAll = () => {
        if (!items || items.length === 0) return;
        clearQueue();
        addToQueue(items);
        navigate(`/player/${items[0].ratingKey}?from=${encodeURIComponent(`/playlist/${id}`)}`);
        toast.success(`Playing ${items.length} items`);
    };

    const handleShufflePlay = () => {
        if (!items || items.length === 0) return;
        clearQueue();
        const shuffled = shuffleArray(items);
        addToQueue(shuffled);
        navigate(`/player/${shuffled[0].ratingKey}?from=${encodeURIComponent(`/playlist/${id}`)}`);
        toast.success(`Shuffling ${items.length} items`);
    };

    if (metaLoading || itemsLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg"/>
            </div>
        );
    }

    if (!playlist) {
        return <p className="text-center text-default-400 py-12">Playlist not found</p>;
    }

    const artSource = playlist.composite || playlist.thumb;

    return (
        <div>
            {/* Hero background */}
            <div className="relative w-full h-[40vh] -mt-16 min-h-[400px]">
                {artSource ? (
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{backgroundImage: `url(${plexImage(artSource, 1920, 1080)})`}}
                    />
                ) : (
                    <div className="absolute inset-0 bg-content2"/>
                )}
                <div className="absolute inset-0 hero-gradient-bottom"/>
                <div className="absolute inset-0 hero-gradient-left opacity-40"/>
            </div>

            {/* Content */}
            <div className="relative z-10 -mt-48 px-6 md:px-12 lg:px-16">
                <div className="flex items-center gap-3 mb-2">
                    <Icon icon="mdi:playlist-play" width="32" className="text-primary"/>
                    <h1 className="text-3xl font-bold">{playlist.title}</h1>
                </div>
                <div className="flex items-center gap-4 text-default-400 text-sm mb-4">
                    {playlist.leafCount != null && (
                        <span>{playlist.leafCount} items</span>
                    )}
                    {playlist.duration != null && playlist.duration > 0 && (
                        <span>{formatDuration(playlist.duration)}</span>
                    )}
                </div>
                {items && items.length > 0 && (
                    <div className="flex gap-3 mb-8">
                        <Button
                            color="primary"
                            startContent={<Icon icon="mdi:play" width="18"/>}
                            onPress={handlePlayAll}
                        >
                            Play All
                        </Button>
                        <Button
                            variant="flat"
                            startContent={<Icon icon="mdi:shuffle-variant" width="18"/>}
                            onPress={handleShufflePlay}
                        >
                            Shuffle & Play
                        </Button>
                    </div>
                )}

                {/* Items grid */}
                {!items || items.length === 0 ? (
                    <p className="text-default-400 text-center py-12">This playlist is empty</p>
                ) : (
                    <div
                        className="grid gap-4"
                        style={{gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))"}}
                    >
                        {items.map((item) => (
                            <MediaCard
                                key={item.ratingKey}
                                item={item}
                                showProgress
                                variant="landscape"
                                lazy
                            />
                        ))}
                    </div>
                )}

                <div className="h-8"/>
            </div>
        </div>
    );
}
