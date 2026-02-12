import {useParams, useNavigate} from "react-router-dom";
import {Button, Spinner, Tabs, Tab, Progress} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useMetadata} from "../hooks/usePlex.ts";
import MetadataInfo from "../components/media/MetadataInfo.tsx";
import EpisodeList from "../components/media/EpisodeList.tsx";
import ContentRow from "../components/layout/ContentRow.tsx";
import MediaCard from "../components/media/MediaCard.tsx";
import {plexApi} from "../lib/plex.ts";
import {plexImage} from "../lib/utils.ts";
import {useQuery} from "@tanstack/react-query";

export default function Detail() {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {data: item, isLoading} = useMetadata(id || "");
    const {data: related} = useQuery({
        queryKey: ["plex", "related", id],
        queryFn: () => plexApi.getRelated(id!),
        enabled: !!id,
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

    return (
        <div>
            {/* Full-bleed art background */}
            <div className="relative w-full h-[50vh]">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: item.art ? `url(${plexImage(item.art, 1920, 1080)})` : undefined,
                    }}
                />
                <div className="absolute inset-0 hero-gradient-bottom"/>
                <div className="absolute inset-0 hero-gradient-left opacity-40"/>
            </div>

            {/* Poster + metadata overlapping art boundary */}
            <div className="relative z-10 -mt-40 px-6 md:px-12 lg:px-16">
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
                </div>

                {/* Tabbed sections */}
                <div className="mt-8">
                    <Tabs
                        aria-label="Detail sections"
                        variant="underlined"
                        classNames={{
                            panel: "pt-6",
                            tabList: "border-b border-default-200/50",
                        }}
                    >
                        {item.type === "show" && (
                            <Tab key="episodes" title="Episodes">
                                <EpisodeList showId={item.ratingKey}/>
                            </Tab>
                        )}
                        {related && related.length > 0 && (
                            <Tab key="related" title="You May Also Like">
                                <ContentRow title="">
                                    {related.map((r) => (
                                        <MediaCard key={r.ratingKey} item={r}/>
                                    ))}
                                </ContentRow>
                            </Tab>
                        )}
                        <Tab key="details" title="Details">
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
                        </Tab>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
