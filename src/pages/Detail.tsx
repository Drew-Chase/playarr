import {useParams, useNavigate, Link} from "react-router-dom";
import {Button, Spinner, Tabs, Tab, Progress} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useMetadata, useChildren} from "../hooks/usePlex.ts";
import MetadataInfo from "../components/media/MetadataInfo.tsx";
import EpisodeList from "../components/media/EpisodeList.tsx";
import ContentRow from "../components/layout/ContentRow.tsx";
import MediaCard from "../components/media/MediaCard.tsx";
import {plexApi} from "../lib/plex.ts";
import {plexImage} from "../lib/utils.ts";
import {useQuery} from "@tanstack/react-query";
import type {PlexMediaItem, PlexRole, PlexReview} from "../lib/types.ts";

function Breadcrumbs({item}: { item: PlexMediaItem }) {
    const crumbs: { label: string; to: string }[] = [];

    if (item.type === "season") {
        if (item.parentRatingKey && item.parentTitle) {
            crumbs.push({label: item.parentTitle, to: `/detail/${item.parentRatingKey}`});
        }
        crumbs.push({label: item.title, to: ""});
    }
    if (item.type === "episode") {
        if (item.grandparentRatingKey && item.grandparentTitle) {
            crumbs.push({label: item.grandparentTitle, to: `/detail/${item.grandparentRatingKey}`});
        }
        if (item.parentRatingKey && item.parentTitle) {
            crumbs.push({label: item.parentTitle, to: `/detail/${item.parentRatingKey}`});
        }
        crumbs.push({label: item.title, to: ""});
    }

    if (crumbs.length === 0) return null;

    return (
        <nav className="flex items-center gap-1.5 text-sm text-default-400 mb-4">
            {crumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <Icon icon="mdi:chevron-right" width="16" className="text-default-300"/>}
                    {crumb.to ? (
                        <Link to={crumb.to} className="hover:text-primary transition-colors">
                            {crumb.label}
                        </Link>
                    ) : (
                        <span className="text-default-200">{crumb.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}

function SeasonsGrid({showId}: { showId: string }) {
    const navigate = useNavigate();
    const {data: seasons, isLoading} = useChildren(showId);

    if (isLoading) return <Spinner size="sm"/>;
    if (!seasons || seasons.length === 0) return null;

    // Single season — skip grid, show episodes directly
    if (seasons.length === 1) {
        return <EpisodeList seasonId={seasons[0].ratingKey}/>;
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {seasons.map((season: PlexMediaItem) => {
                const thumbUrl = season.thumb ? `/api/media/${season.ratingKey}/thumb` : "";
                const episodeCount = season.leafCount;
                return (
                    <div
                        key={season.ratingKey}
                        className="cursor-pointer group"
                        onClick={() => navigate(`/detail/${season.ratingKey}`)}
                    >
                        <div className="relative rounded-lg overflow-hidden bg-content2 aspect-[2/3]">
                            {thumbUrl ? (
                                <img
                                    src={thumbUrl}
                                    alt={season.title}
                                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full bg-content3 flex items-center justify-center">
                                    <Icon icon="mdi:folder" width="48" className="text-default-400"/>
                                </div>
                            )}
                            <div className="absolute inset-0 rounded-lg ring-0 group-hover:ring-2 ring-primary/50 transition-all"/>
                        </div>
                        <div className="mt-2 px-1">
                            <p className="text-sm font-semibold truncate">{season.title}</p>
                            {episodeCount != null && (
                                <p className="text-xs text-default-400">{episodeCount} episode{episodeCount !== 1 ? "s" : ""}</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function EpisodeDetail({item}: { item: PlexMediaItem }) {
    const navigate = useNavigate();
    const thumbUrl = item.thumb ? `/api/media/${item.ratingKey}/thumb` : "";
    const progress = item.viewOffset && item.duration
        ? (item.viewOffset / item.duration) * 100
        : 0;

    return (
        <div>
            {/* Episode thumbnail */}
            {thumbUrl && (
                <div className="relative max-w-2xl rounded-lg overflow-hidden mb-6 aspect-video">
                    <img
                        src={thumbUrl}
                        alt={item.title}
                        className="object-cover w-full h-full"
                    />
                </div>
            )}

            <MetadataInfo item={item}/>

            <div className="flex flex-wrap gap-3 mt-5">
                <Button
                    color="primary"
                    size="lg"
                    startContent={<Icon icon="mdi:play" width="24"/>}
                    onPress={() => navigate(`/player/${item.ratingKey}`)}
                    className="font-semibold"
                >
                    {item.viewOffset ? "Resume" : "Play"}
                </Button>
                {progress > 0 && (
                    <div className="flex items-center">
                        <Progress
                            size="sm"
                            value={progress}
                            className="w-32"
                            classNames={{indicator: "bg-primary"}}
                        />
                        <span className="text-xs text-default-400 ml-2">{Math.round(progress)}%</span>
                    </div>
                )}
                {item.viewCount ? (
                    <Button
                        variant="bordered"
                        size="lg"
                        startContent={<Icon icon="mdi:eye-off" width="20"/>}
                        onPress={() => plexApi.unscrobble(item.ratingKey)}
                    >
                        Mark Unwatched
                    </Button>
                ) : (
                    <Button
                        variant="bordered"
                        size="lg"
                        startContent={<Icon icon="mdi:eye" width="20"/>}
                        onPress={() => plexApi.scrobble(item.ratingKey)}
                    >
                        Mark Watched
                    </Button>
                )}
            </div>
        </div>
    );
}

export default function Detail() {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {data: item, isLoading} = useMetadata(id || "");
    const {data: related} = useQuery({
        queryKey: ["plex", "related", id],
        queryFn: () => plexApi.getRelated(id!),
        enabled: !!id && item?.type !== "season" && item?.type !== "episode",
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg"/>
            </div>
        );
    }

    if (!item) {
        return <p className="text-center text-default-400 py-12">Item not found</p>;
    }

    const progress = item.viewOffset && item.duration
        ? (item.viewOffset / item.duration) * 100
        : 0;

    const artSource = item.type === "episode" || item.type === "season"
        ? item.art || item.thumb
        : item.art;

    return (
        <div>
            {/* Full-bleed art background */}
            <div className="relative w-full h-[50vh] -mt-16">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: artSource ? `url(${plexImage(artSource, 1920, 1080)})` : undefined,
                    }}
                />
                <div className="absolute inset-0 hero-gradient-bottom"/>
                <div className="absolute inset-0 hero-gradient-left opacity-40"/>
            </div>

            {/* Content area */}
            <div className="relative z-10 -mt-40 px-6 md:px-12 lg:px-16">
                <Breadcrumbs item={item}/>

                {item.type === "episode" ? (
                    /* Episode detail — no poster column, full-width episode view */
                    <EpisodeDetail item={item}/>
                ) : (
                    /* Movie / Show / Season — poster + metadata layout */
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Poster */}
                        <div className="shrink-0">
                            <img
                                src={item.thumb ? `/api/media/${item.ratingKey}/thumb` : ""}
                                alt={item.title}
                                className="w-[200px] h-[300px] object-cover rounded-lg shadow-2xl"
                            />
                        </div>

                        {/* Info */}
                        <div className="flex-1 pt-4 md:pt-12">
                            <MetadataInfo item={item}/>
                            {(item.type === "movie" || item.type === "season") && (
                                <div className="flex flex-wrap gap-3 mt-5">
                                    <Button
                                        color="primary"
                                        size="lg"
                                        startContent={<Icon icon="mdi:play" width="24"/>}
                                        onPress={() => navigate(`/player/${item.ratingKey}`)}
                                        className="font-semibold"
                                    >
                                        {item.viewOffset ? "Resume" : "Play"}
                                    </Button>
                                    {progress > 0 && (
                                        <div className="flex items-center">
                                            <Progress
                                                size="sm"
                                                value={progress}
                                                className="w-32"
                                                classNames={{indicator: "bg-primary"}}
                                            />
                                            <span className="text-xs text-default-400 ml-2">{Math.round(progress)}%</span>
                                        </div>
                                    )}
                                    {item.viewCount ? (
                                        <Button
                                            variant="bordered"
                                            size="lg"
                                            startContent={<Icon icon="mdi:eye-off" width="20"/>}
                                            onPress={() => plexApi.unscrobble(item.ratingKey)}
                                        >
                                            Mark Unwatched
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="bordered"
                                            size="lg"
                                            startContent={<Icon icon="mdi:eye" width="20"/>}
                                            onPress={() => plexApi.scrobble(item.ratingKey)}
                                        >
                                            Mark Watched
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Type-specific content sections */}
                <div className="mt-8">
                    {item.type === "show" && (
                        <Tabs
                            aria-label="Show sections"
                            variant="underlined"
                            classNames={{
                                panel: "pt-6",
                                tabList: "border-b border-default-200/50",
                            }}
                        >
                            <Tab key="seasons" title="Seasons">
                                <SeasonsGrid showId={item.ratingKey}/>
                            </Tab>
                            {related && related.length > 0 && (
                                <Tab key="related" title="You May Also Like">
                                    <ContentRow title="">
                                        {related.map((r: PlexMediaItem) => (
                                            <MediaCard key={r.ratingKey} item={r}/>
                                        ))}
                                    </ContentRow>
                                </Tab>
                            )}
                            <Tab key="details" title="Details">
                                <DetailsSummary item={item}/>
                            </Tab>
                        </Tabs>
                    )}

                    {item.type === "season" && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Episodes</h2>
                            <EpisodeList seasonId={item.ratingKey}/>
                        </div>
                    )}

                    {item.type === "movie" && (
                        <Tabs
                            aria-label="Movie sections"
                            variant="underlined"
                            classNames={{
                                panel: "pt-6",
                                tabList: "border-b border-default-200/50",
                            }}
                        >
                            {related && related.length > 0 && (
                                <Tab key="related" title="You May Also Like">
                                    <ContentRow title="">
                                        {related.map((r: PlexMediaItem) => (
                                            <MediaCard key={r.ratingKey} item={r}/>
                                        ))}
                                    </ContentRow>
                                </Tab>
                            )}
                            <Tab key="details" title="Details">
                                <DetailsSummary item={item}/>
                            </Tab>
                        </Tabs>
                    )}
                </div>
            </div>
        </div>
    );
}

function DetailsSummary({item}: { item: PlexMediaItem }) {
    return (
        <div className="max-w-2xl space-y-4">
            {item.summary && (
                <div>
                    <h3 className="text-sm font-semibold text-default-400 mb-1">Summary</h3>
                    <p className="text-sm text-default-300 leading-relaxed">{item.summary}</p>
                </div>
            )}
            {item.contentRating && (
                <div>
                    <h3 className="text-sm font-semibold text-default-400 mb-1">Rating</h3>
                    <p className="text-sm">{item.contentRating}</p>
                </div>
            )}
            {item.year && (
                <div>
                    <h3 className="text-sm font-semibold text-default-400 mb-1">Year</h3>
                    <p className="text-sm">{item.year}</p>
                </div>
            )}
        </div>
    );
}
