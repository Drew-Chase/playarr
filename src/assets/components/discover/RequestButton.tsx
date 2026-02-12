import {Button} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useState} from "react";
import {toast} from "sonner";
import {api} from "../../lib/api";

interface RequestButtonProps {
    tmdbId: number;
    title: string;
    mediaType: "movie" | "tv";
}

export default function RequestButton({tmdbId, title, mediaType}: RequestButtonProps) {
    const [isRequesting, setIsRequesting] = useState(false);
    const [requested, setRequested] = useState(false);

    const handleRequest = async () => {
        setIsRequesting(true);
        try {
            if (mediaType === "movie") {
                await api.post("/radarr/movie", {
                    tmdbId,
                    title,
                    qualityProfileId: 1,
                    rootFolderPath: "/movies",
                    monitored: true,
                    addOptions: {searchForMovie: true},
                });
            } else {
                await api.post("/sonarr/series", {
                    tvdbId: tmdbId,
                    title,
                    qualityProfileId: 1,
                    rootFolderPath: "/tv",
                    monitored: true,
                    addOptions: {searchForMissingEpisodes: true},
                });
            }
            setRequested(true);
            toast.success(`Requested "${title}"`);
        } catch (err) {
            toast.error(`Failed to request "${title}": ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            setIsRequesting(false);
        }
    };

    if (requested) {
        return (
            <Button
                size="sm"
                color="success"
                variant="flat"
                isDisabled
                className="w-full mt-1"
                startContent={<Icon icon="mdi:check" width="14"/>}
            >
                Requested
            </Button>
        );
    }

    return (
        <Button
            size="sm"
            color="primary"
            variant="flat"
            className="w-full mt-1"
            onPress={handleRequest}
            isLoading={isRequesting}
            startContent={!isRequesting ? <Icon icon="mdi:plus" width="14"/> : undefined}
        >
            Request
        </Button>
    );
}
