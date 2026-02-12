import {useParams, useNavigate} from "react-router-dom";
import {Button, Spinner} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useMetadata} from "../hooks/usePlex";
import MetadataInfo from "../components/media/MetadataInfo";
import EpisodeList from "../components/media/EpisodeList";
import ContentRow from "../components/layout/ContentRow";
import MediaCard from "../components/media/MediaCard";
import {plexApi} from "../lib/plex";
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

    return (
        <div>
            {/* Background art */}
            <div className="relative -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6">
                <div
                    className="h-[250px] md:h-[350px] bg-cover bg-center"
                    style={{
                        backgroundImage: item.art ? `url(/api/media/${item.ratingKey}/art)` : undefined,
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent"/>
            </div>

            <div className="flex flex-col md:flex-row gap-6 -mt-32 relative z-10">
                {/* Poster */}
                <div className="shrink-0">
                    <img
                        src={item.thumb ? `/api/media/${item.ratingKey}/thumb` : ""}
                        alt={item.title}
                        className="w-[200px] h-[300px] object-cover rounded-lg shadow-lg"
                    />
                </div>

                {/* Info */}
                <div className="flex-1">
                    <MetadataInfo item={item}/>
                    <div className="flex gap-2 mt-4">
                        <Button
                            color="primary"
                            size="lg"
                            startContent={<Icon icon="mdi:play" width="24"/>}
                            onPress={() => navigate(`/player/${item.ratingKey}`)}
                        >
                            {item.viewOffset ? "Resume" : "Play"}
                        </Button>
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

            {/* Episodes for TV shows */}
            {item.type === "show" && (
                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">Episodes</h2>
                    <EpisodeList showId={item.ratingKey}/>
                </div>
            )}

            {/* Related content */}
            {related && related.length > 0 && (
                <div className="mt-8">
                    <ContentRow title="Related">
                        {related.map((r) => (
                            <MediaCard key={r.ratingKey} item={r}/>
                        ))}
                    </ContentRow>
                </div>
            )}
        </div>
    );
}
