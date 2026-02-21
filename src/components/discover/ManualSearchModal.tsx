import {useMemo, useState} from "react";
import {
    Modal, ModalContent, ModalHeader, ModalBody,
    Spinner, Button, Chip, Tooltip, Input, Checkbox,
    Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
    Popover, PopoverTrigger, PopoverContent
} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {api} from "../../lib/api.ts";
import {useSonarrReleases, useRadarrReleases} from "../../hooks/useDiscover.ts";
import type {ReleaseResource} from "../../lib/types.ts";

interface SortDescriptor
{
    column: string | number;
    direction: "ascending" | "descending";
}

function formatSize(bytes: number): string
{
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatAge(ageMinutes: number): string
{
    if (ageMinutes < 60) return `${Math.round(ageMinutes)}m`;
    const hours = ageMinutes / 60;
    if (hours < 24) return `${hours.toFixed(1)} hours`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? "s" : ""}`;
}

interface ManualSearchModalProps
{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    sonarrEpisodeId?: number;
    sonarrSeriesId?: number;
    sonarrSeasonNumber?: number;
    radarrMovieId?: number;
}

/** Filter popover rendered inline in a column header */
function ColumnFilter({allValues, selected, onSelectionChange, label}: {
    allValues: string[];
    selected: Set<string>;
    onSelectionChange: (v: Set<string>) => void;
    label: string;
})
{
    const [search, setSearch] = useState("");
    const filtered = allValues.filter(v => v.toLowerCase().includes(search.toLowerCase()));
    const hasFilters = selected.size > 0;

    return (
        <Popover placement="bottom-start">
            <PopoverTrigger>
                <button
                    className={`ml-1 inline-flex items-center ${hasFilters ? "text-primary" : "text-default-400 hover:text-default-200"}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Icon icon={hasFilters ? "mdi:filter" : "mdi:filter-outline"} width="14"/>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0">
                <div className="p-2 border-b border-divider">
                    <Input
                        size="sm"
                        placeholder={`Search ${label.toLowerCase()}...`}
                        value={search}
                        onValueChange={setSearch}
                        startContent={<Icon icon="mdi:magnify" width="16" className="text-default-400"/>}
                        classNames={{inputWrapper: "h-8"}}
                    />
                </div>
                <div className="max-h-60 overflow-y-auto p-2 flex flex-col gap-1">
                    {filtered.length === 0 ? (
                        <p className="text-xs text-default-400 px-2 py-1">No matches</p>
                    ) : filtered.map(value => (
                        <Checkbox
                            key={value}
                            size="sm"
                            isSelected={selected.has(value)}
                            onValueChange={(checked) =>
                            {
                                const next = new Set(selected);
                                if (checked) next.add(value);
                                else next.delete(value);
                                onSelectionChange(next);
                            }}
                            classNames={{label: "text-sm"}}
                        >
                            {value}
                        </Checkbox>
                    ))}
                </div>
                {hasFilters && (
                    <div className="p-2 border-t border-divider">
                        <Button size="sm" variant="light" className="w-full text-danger" onPress={() => onSelectionChange(new Set())}>
                            Clear
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

function GrabButton({release, service}: { release: ReleaseResource; service: "sonarr" | "radarr" })
{
    const [grabbing, setGrabbing] = useState(false);
    const [grabbed, setGrabbed] = useState(false);

    const handleGrab = async () =>
    {
        setGrabbing(true);
        try
        {
            await api.post(`/${service}/release`, {guid: release.guid, indexerId: release.indexerId});
            setGrabbed(true);
            toast.success("Release grabbed");
        } catch
        {
            toast.error("Failed to grab release");
        } finally
        {
            setGrabbing(false);
        }
    };

    if (grabbed) return <Icon icon="mdi:check" width="18" className="text-success"/>;
    return (
        <Button
            onPress={handleGrab}
            isIconOnly
            variant={"light"}
            isLoading={grabbing}
            disabled={grabbing}
        >
            <Icon icon="mdi:download" width={16} className={"min-w-4 min-h-4"}/>
        </Button>
    );
}

export default function ManualSearchModal({
                                              isOpen,
                                              onClose,
                                              title,
                                              sonarrEpisodeId,
                                              sonarrSeriesId,
                                              sonarrSeasonNumber,
                                              radarrMovieId
                                          }: ManualSearchModalProps)
{
    const queryClient = useQueryClient();
    const isSonarr = sonarrEpisodeId !== undefined || sonarrSeriesId !== undefined;
    const isRadarr = radarrMovieId !== undefined;

    const sonarrParams = isSonarr && isOpen ? {
        episodeId: sonarrEpisodeId,
        seriesId: sonarrSeriesId,
        seasonNumber: sonarrSeasonNumber
    } : null;

    const {data: sonarrReleases, isLoading: sonarrLoading} = useSonarrReleases(sonarrParams);
    const {data: radarrReleases, isLoading: radarrLoading} = useRadarrReleases(isRadarr && isOpen ? radarrMovieId! : null);

    const releases = isSonarr ? sonarrReleases : radarrReleases;
    const isLoading = isSonarr ? sonarrLoading : radarrLoading;
    const service = isSonarr ? "sonarr" : "radarr";

    // Sorting
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({column: "age", direction: "ascending"});

    // Title search
    const [titleSearch, setTitleSearch] = useState("");

    // Filters
    const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set());
    const [qualityFilter, setQualityFilter] = useState<Set<string>>(new Set());
    const [languageFilter, setLanguageFilter] = useState<Set<string>>(new Set());
    const [indexerFilter, setIndexerFilter] = useState<Set<string>>(new Set());

    // Derive unique values for filter dropdowns
    const uniqueValues = useMemo(() =>
    {
        if (!releases) return {sources: [], qualities: [], languages: [], indexers: []};
        const sources = [...new Set(releases.map(r => r.protocol === "usenet" ? "Usenet" : "Torrent"))].sort();
        const qualities = [...new Set(releases.map(r => r.quality?.quality?.name || "Unknown"))].sort();
        const languages = [...new Set(releases.map(r => r.languages?.[0]?.name || "English"))].sort();
        const indexers = [...new Set(releases.map(r => r.indexer))].sort();
        return {sources, qualities, languages, indexers};
    }, [releases]);

    // Filter + sort releases
    const processedReleases = useMemo(() =>
    {
        if (!releases) return [];
        let filtered = [...releases];

        if (titleSearch.trim())
        {
            const q = titleSearch.toLowerCase();
            filtered = filtered.filter(r => r.title.toLowerCase().includes(q));
        }
        if (sourceFilter.size > 0)
        {
            filtered = filtered.filter(r => sourceFilter.has(r.protocol === "usenet" ? "Usenet" : "Torrent"));
        }
        if (qualityFilter.size > 0)
        {
            filtered = filtered.filter(r => qualityFilter.has(r.quality?.quality?.name || "Unknown"));
        }
        if (languageFilter.size > 0)
        {
            filtered = filtered.filter(r => languageFilter.has(r.languages?.[0]?.name || "English"));
        }
        if (indexerFilter.size > 0)
        {
            filtered = filtered.filter(r => indexerFilter.has(r.indexer));
        }

        // Sort by column
        filtered.sort((a, b) =>
        {
            const col = sortDescriptor.column as string;
            const dir = sortDescriptor.direction === "ascending" ? 1 : -1;

            let cmp = 0;
            switch (col)
            {
                case "age":
                    cmp = a.ageMinutes - b.ageMinutes;
                    break;
                case "title":
                    cmp = a.title.localeCompare(b.title);
                    break;
                case "indexer":
                    cmp = a.indexer.localeCompare(b.indexer);
                    break;
                case "size":
                    cmp = a.size - b.size;
                    break;
                case "peers":
                    cmp = (a.seeders ?? 0) - (b.seeders ?? 0);
                    break;
                case "quality":
                    cmp = (a.quality?.quality?.name || "").localeCompare(b.quality?.quality?.name || "");
                    break;
                case "language":
                    cmp = (a.languages?.[0]?.name || "").localeCompare(b.languages?.[0]?.name || "");
                    break;
            }
            return cmp * dir;
        });

        return filtered;
    }, [releases, titleSearch, sourceFilter, qualityFilter, languageFilter, indexerFilter, sortDescriptor]);

    const hasTorrents = releases?.some(r => r.protocol === "torrent") ?? false;
    const activeFilterCount = [sourceFilter, qualityFilter, languageFilter, indexerFilter].filter(s => s.size > 0).length;

    const handleClose = () =>
    {
        onClose();
        queryClient.removeQueries({queryKey: ["sonarr", "releases"]});
        queryClient.removeQueries({queryKey: ["radarr", "releases"]});
        setTitleSearch("");
        setSourceFilter(new Set());
        setQualityFilter(new Set());
        setLanguageFilter(new Set());
        setIndexerFilter(new Set());
        setSortDescriptor({column: "age", direction: "ascending"});
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="full" backdrop="blur" scrollBehavior="inside" classNames={{wrapper: "z-[100]", backdrop: "z-[100]"}}>
            <ModalContent>
                <ModalHeader className="flex items-center gap-3 pb-2">
                    <Icon icon="mdi:magnify" width="20"/>
                    <span>{title}</span>
                    {releases && (
                        <Chip size="sm" variant="flat" className="ml-2">
                            {processedReleases.length === releases.length
                                ? `${releases.length} results`
                                : `${processedReleases.length} of ${releases.length} results`}
                        </Chip>
                    )}
                </ModalHeader>
                <ModalBody className="px-4 pt-0 gap-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Spinner size="lg"/>
                            <p className="text-sm text-default-400">Searching indexers...</p>
                        </div>
                    ) : !releases || releases.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Icon icon="mdi:magnify-close" width="48" className="text-default-300"/>
                            <p className="text-sm text-default-400">No releases found</p>
                        </div>
                    ) : (
                        <>
                            {/* Search bar */}
                            <div className="flex items-center gap-2 pb-3 sticky top-0 z-20 bg-content1 pt-1">
                                <Input
                                    size="sm"
                                    placeholder="Search releases..."
                                    value={titleSearch}
                                    onValueChange={setTitleSearch}
                                    startContent={<Icon icon="mdi:magnify" width="16" className="text-default-400"/>}
                                    isClearable
                                    onClear={() => setTitleSearch("")}
                                    classNames={{base: "w-72", inputWrapper: "h-8"}}
                                />
                                {activeFilterCount > 0 && (
                                    <Button size="sm" variant="light" className="text-danger" onPress={() =>
                                    {
                                        setSourceFilter(new Set());
                                        setQualityFilter(new Set());
                                        setLanguageFilter(new Set());
                                        setIndexerFilter(new Set());
                                    }}>
                                        Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                                    </Button>
                                )}
                            </div>

                            {/* Table */}
                            <Table
                                aria-label="Release search results"
                                sortDescriptor={sortDescriptor}
                                onSortChange={setSortDescriptor}
                                removeWrapper
                                fullWidth
                                classNames={{
                                    base: "w-full",
                                    table: "w-full",
                                    th: "bg-content2 text-default-400 text-xs uppercase",
                                    td: "text-sm py-2"
                                }}
                            >
                                <TableHeader>
                                    <TableColumn key="source" width={70}>
                                        <span className="inline-flex items-center">
                                            SOURCE
                                            <ColumnFilter label="Source" allValues={uniqueValues.sources} selected={sourceFilter} onSelectionChange={setSourceFilter}/>
                                        </span>
                                    </TableColumn>
                                    <TableColumn key="age" allowsSorting width={90}>AGE</TableColumn>
                                    <TableColumn key="title" allowsSorting>TITLE</TableColumn>
                                    <TableColumn key="indexer" allowsSorting width={110}>
                                        <span className="inline-flex items-center">
                                            INDEXER
                                            <ColumnFilter label="Indexer" allValues={uniqueValues.indexers} selected={indexerFilter} onSelectionChange={setIndexerFilter}/>
                                        </span>
                                    </TableColumn>
                                    <TableColumn key="size" allowsSorting width={90} align="end">SIZE</TableColumn>
                                    {hasTorrents ? (
                                        <TableColumn key="peers" allowsSorting width={80} align="center">PEERS</TableColumn>
                                    ) : (
                                        <TableColumn key="peers_hidden" width={0}> </TableColumn>
                                    )}
                                    <TableColumn key="language" allowsSorting width={100}>
                                        <span className="inline-flex items-center">
                                            LANGUAGE
                                            <ColumnFilter label="Language" allValues={uniqueValues.languages} selected={languageFilter} onSelectionChange={setLanguageFilter}/>
                                        </span>
                                    </TableColumn>
                                    <TableColumn key="quality" allowsSorting width={130}>
                                        <span className="inline-flex items-center">
                                            QUALITY
                                            <ColumnFilter label="Quality" allValues={uniqueValues.qualities} selected={qualityFilter} onSelectionChange={setQualityFilter}/>
                                        </span>
                                    </TableColumn>
                                    <TableColumn key="actions" width={80} align="center"> </TableColumn>
                                </TableHeader>
                                <TableBody items={processedReleases}>
                                    {(release) =>
                                    {
                                        const isRejected = (release.rejections?.length ?? 0) > 0;
                                        const qualityName = release.quality?.quality?.name || "Unknown";
                                        const language = release.languages?.[0]?.name || "English";

                                        return (
                                            <TableRow key={release.guid}>
                                                <TableCell>
                                                    <Chip
                                                        size="sm"
                                                        variant="flat"
                                                        className={`text-[10px] ${release.protocol === "usenet" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"}`}
                                                    >
                                                        {release.protocol === "usenet" ? "nzb" : "tor"}
                                                    </Chip>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-default-300 text-xs">{formatAge(release.ageMinutes)}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip content={release.title} delay={500}>
                                                        <p className="truncate max-w-[600px] text-foreground text-xs">
                                                            {release.title}
                                                        </p>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-default-300 text-xs">{release.indexer}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-default-300 text-xs">{formatSize(release.size)}</span>
                                                </TableCell>
                                                <TableCell>
                                                    {release.protocol === "torrent" ? (
                                                        <span className="text-xs">
                                                            <span className="text-green-400">{release.seeders ?? 0}</span>
                                                            <span className="text-default-400">/{release.leechers ?? 0}</span>
                                                        </span>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip size="sm" variant="flat" className="text-[10px]">{language}</Chip>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip size="sm" variant="flat" className="text-[10px] bg-primary/20 text-primary">{qualityName}</Chip>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-row items-center justify-end gap-4">
                                                        {isRejected && (
                                                            <Tooltip content={release.rejections!.join("\n")}>
                                                                <span><Icon icon="mdi:alert-circle" width="16" className="text-danger"/></span>
                                                            </Tooltip>
                                                        )}
                                                        <GrabButton release={release} service={service}/>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }}
                                </TableBody>
                            </Table>
                        </>
                    )}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
