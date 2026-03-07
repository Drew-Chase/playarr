import {useParams} from "react-router-dom";
import {Spinner} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {usePlaylistMetadata, usePlaylistItems} from "../hooks/usePlex.ts";
import type {PlexMediaItem} from "../lib/types.ts";
import {plexImage, formatDuration} from "../lib/utils.ts";
import ContentRow from "../components/layout/ContentRow.tsx";
import MediaCard from "../components/media/MediaCard.tsx";

interface ItemGroup {
    key: string;
    title: string;
    type: "series" | "movies";
    items: PlexMediaItem[];
}

/** Group playlist items: episodes by series, movies collected together. */
function groupPlaylistItems(items: PlexMediaItem[]): ItemGroup[] {
    const groups: ItemGroup[] = [];
    const seriesMap = new Map<string, ItemGroup>();
    let movieGroup: ItemGroup | null = null;

    for (const item of items) {
        if (item.type === "episode" && item.grandparentRatingKey) {
            let group = seriesMap.get(item.grandparentRatingKey);
            if (!group) {
                group = {
                    key: item.grandparentRatingKey,
                    title: item.grandparentTitle || "Unknown Series",
                    type: "series",
                    items: [],
                };
                seriesMap.set(item.grandparentRatingKey, group);
                groups.push(group);
            }
            group.items.push(item);
        } else if (item.type === "movie") {
            if (!movieGroup) {
                movieGroup = {key: "movies", title: "Movies", type: "movies", items: []};
                groups.push(movieGroup);
            }
            movieGroup.items.push(item);
        } else {
            // Other types (e.g., clips) — treat like movies
            if (!movieGroup) {
                movieGroup = {key: "movies", title: "Movies", type: "movies", items: []};
                groups.push(movieGroup);
            }
            movieGroup.items.push(item);
        }
    }

    return groups;
}

export default function Playlist() {
    const {id} = useParams<{ id: string }>();
    const {data: playlist, isLoading: metaLoading} = usePlaylistMetadata(id || "");
    const {data: items, isLoading: itemsLoading} = usePlaylistItems(id || "");

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

    const groups = items ? groupPlaylistItems(items) : [];
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
                <div className="flex items-center gap-4 text-default-400 text-sm mb-8">
                    {playlist.leafCount != null && (
                        <span>{playlist.leafCount} items</span>
                    )}
                    {playlist.duration != null && playlist.duration > 0 && (
                        <span>{formatDuration(playlist.duration)}</span>
                    )}
                </div>

                {/* Grouped items */}
                {groups.length === 0 && (
                    <p className="text-default-400 text-center py-12">This playlist is empty</p>
                )}

                <div className="-mx-6 md:-mx-12 lg:-mx-16">
                    {groups.map((group) => (
                        <ContentRow key={group.key} title={group.title}>
                            {group.items.map((item) => (
                                <MediaCard
                                    key={item.ratingKey}
                                    item={item}
                                    showProgress
                                    variant={group.type === "series" ? "landscape" : "portrait"}
                                    width={group.type === "series" ? 480 : 250}
                                />
                            ))}
                        </ContentRow>
                    ))}
                </div>

                <div className="h-8"/>
            </div>
        </div>
    );
}
