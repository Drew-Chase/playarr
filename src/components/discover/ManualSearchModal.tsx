import {useState} from "react";
import {
    Modal, ModalContent, ModalHeader, ModalBody,
    Spinner, Button, Chip, Tooltip,
} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {api} from "../../lib/api.ts";
import {useSonarrReleases, useRadarrReleases} from "../../hooks/useDiscover.ts";
import type {ReleaseResource} from "../../lib/types.ts";

function formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatAge(ageMinutes: number): string {
    if (ageMinutes < 60) return `${Math.round(ageMinutes)}m`;
    const hours = ageMinutes / 60;
    if (hours < 24) return `${hours.toFixed(1)} hours`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? "s" : ""}`;
}

interface ManualSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    // Sonarr search params
    sonarrEpisodeId?: number;
    sonarrSeriesId?: number;
    sonarrSeasonNumber?: number;
    // Radarr search params
    radarrMovieId?: number;
}

function ReleaseRow({release, service}: { release: ReleaseResource; service: "sonarr" | "radarr" }) {
    const [grabbing, setGrabbing] = useState(false);
    const [grabbed, setGrabbed] = useState(false);

    const handleGrab = async () => {
        setGrabbing(true);
        try {
            await api.post(`/${service}/release`, {
                guid: release.guid,
                indexerId: 0,
            });
            setGrabbed(true);
            toast.success("Release grabbed");
        } catch {
            toast.error("Failed to grab release");
        } finally {
            setGrabbing(false);
        }
    };

    const isRejected = release.rejections && release.rejections.length > 0;
    const qualityName = release.quality?.quality?.name || "Unknown";
    const language = release.languages?.[0]?.name || "English";

    return (
        <div className={`flex items-center gap-3 px-4 py-2.5 hover:bg-content3/50 transition-colors border-b border-divider text-sm ${isRejected ? "opacity-50" : ""}`}>
            {/* Source badge */}
            <div className="shrink-0 w-10">
                <Chip
                    size="sm"
                    variant="flat"
                    className={`text-[10px] ${release.protocol === "usenet" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"}`}
                >
                    {release.protocol === "usenet" ? "nzb" : "tor"}
                </Chip>
            </div>

            {/* Age */}
            <div className="shrink-0 w-20 text-xs text-default-400">
                {formatAge(release.ageMinutes)}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
                <p className="truncate text-xs"
                   title={release.title}>
                    {release.title}
                </p>
            </div>

            {/* Indexer */}
            <div className="shrink-0 w-20 text-xs text-default-400 truncate">
                {release.indexer}
            </div>

            {/* Size */}
            <div className="shrink-0 w-16 text-xs text-default-400 text-right">
                {formatSize(release.size)}
            </div>

            {/* Peers (torrent only) */}
            {release.protocol === "torrent" && (
                <div className="shrink-0 w-14 text-xs text-default-400 text-center">
                    {release.seeders !== undefined && (
                        <span className="text-green-400">{release.seeders}</span>
                    )}
                    {release.leechers !== undefined && (
                        <span className="text-default-500">/{release.leechers}</span>
                    )}
                </div>
            )}

            {/* Language */}
            <div className="shrink-0 w-16">
                <Chip size="sm" variant="flat" className="text-[10px]">{language}</Chip>
            </div>

            {/* Quality */}
            <div className="shrink-0 w-28">
                <Chip size="sm" variant="flat" className="text-[10px] bg-primary/20 text-primary">{qualityName}</Chip>
            </div>

            {/* Rejection indicator */}
            <div className="shrink-0 w-6">
                {isRejected && (
                    <Tooltip content={release.rejections!.join("\n")}>
                        <Icon icon="mdi:alert-circle" width="16" className="text-danger"/>
                    </Tooltip>
                )}
            </div>

            {/* Grab button */}
            <div className="shrink-0 w-8">
                {grabbed ? (
                    <Icon icon="mdi:check" width="18" className="text-success"/>
                ) : (
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={handleGrab}
                        isLoading={grabbing}
                    >
                        <Icon icon="mdi:download" width="16" className="text-default-400"/>
                    </Button>
                )}
            </div>
        </div>
    );
}

export default function ManualSearchModal({
    isOpen,
    onClose,
    title,
    sonarrEpisodeId,
    sonarrSeriesId,
    sonarrSeasonNumber,
    radarrMovieId,
}: ManualSearchModalProps) {
    const queryClient = useQueryClient();
    const isSonarr = sonarrEpisodeId !== undefined || sonarrSeriesId !== undefined;
    const isRadarr = radarrMovieId !== undefined;

    // Only build params when modal is open so queries don't fire while closed
    const sonarrParams = isSonarr && isOpen ? {
        episodeId: sonarrEpisodeId,
        seriesId: sonarrSeriesId,
        seasonNumber: sonarrSeasonNumber,
    } : null;

    const {data: sonarrReleases, isLoading: sonarrLoading} = useSonarrReleases(sonarrParams);
    const {data: radarrReleases, isLoading: radarrLoading} = useRadarrReleases(isRadarr && isOpen ? radarrMovieId! : null);

    const releases = isSonarr ? sonarrReleases : radarrReleases;
    const isLoading = isSonarr ? sonarrLoading : radarrLoading;
    const service = isSonarr ? "sonarr" : "radarr";

    const handleClose = () => {
        onClose();
        // Clear cached release results so reopening triggers a fresh search
        queryClient.removeQueries({queryKey: ["sonarr", "releases"]});
        queryClient.removeQueries({queryKey: ["radarr", "releases"]});
    };

    // Sort: approved first, then by age (newest first)
    const sortedReleases = releases
        ? [...releases].sort((a, b) => {
            const aRejected = (a.rejections?.length ?? 0) > 0;
            const bRejected = (b.rejections?.length ?? 0) > 0;
            if (aRejected !== bRejected) return aRejected ? 1 : -1;
            return a.ageMinutes - b.ageMinutes;
        })
        : [];

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="full" backdrop="blur" scrollBehavior="inside" classNames={{wrapper: "z-[100]", backdrop: "z-[100]"}}>
            <ModalContent>
                <ModalHeader className="flex items-center gap-3">
                    <Icon icon="mdi:magnify" width="20"/>
                    <span>{title}</span>
                    {releases && (
                        <Chip size="sm" variant="flat" className="ml-2">{releases.length} results</Chip>
                    )}
                </ModalHeader>
                <ModalBody className="px-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Spinner size="lg"/>
                            <p className="text-sm text-default-400">Searching indexers...</p>
                        </div>
                    ) : sortedReleases.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Icon icon="mdi:magnify-close" width="48" className="text-default-300"/>
                            <p className="text-sm text-default-400">No releases found</p>
                        </div>
                    ) : (
                        <div>
                            {/* Header */}
                            <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-default-500 border-b border-divider bg-content2/50 sticky top-0 z-10">
                                <div className="shrink-0 w-10">Source</div>
                                <div className="shrink-0 w-20">Age</div>
                                <div className="flex-1">Title</div>
                                <div className="shrink-0 w-20">Indexer</div>
                                <div className="shrink-0 w-16 text-right">Size</div>
                                {sortedReleases.some(r => r.protocol === "torrent") && (
                                    <div className="shrink-0 w-14 text-center">Peers</div>
                                )}
                                <div className="shrink-0 w-16">Language</div>
                                <div className="shrink-0 w-28">Quality</div>
                                <div className="shrink-0 w-6"/>
                                <div className="shrink-0 w-8"/>
                            </div>
                            {/* Rows */}
                            {sortedReleases.map((release) => (
                                <ReleaseRow key={release.guid} release={release} service={service}/>
                            ))}
                        </div>
                    )}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
