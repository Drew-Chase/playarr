import {useState, useEffect, useCallback} from "react";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerBody,
    Button,
    Input,
    Select,
    SelectItem,
    Spinner,
    Chip,
} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {toast} from "sonner";
import {plexApi} from "../../lib/plex.ts";
import type {PlexMediaItem, SubtitleSearchResult} from "../../lib/types.ts";

interface SubtitleSearchDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    item: PlexMediaItem;
    onUseLocally: (blobUrl: string, label: string) => void;
}

const LANGUAGES = [
    {code: "en", label: "English"},
    {code: "es", label: "Spanish"},
    {code: "fr", label: "French"},
    {code: "de", label: "German"},
    {code: "pt-BR", label: "Portuguese (BR)"},
    {code: "pt-PT", label: "Portuguese (PT)"},
    {code: "it", label: "Italian"},
    {code: "nl", label: "Dutch"},
    {code: "pl", label: "Polish"},
    {code: "ru", label: "Russian"},
    {code: "ja", label: "Japanese"},
    {code: "zh-CN", label: "Chinese (Simplified)"},
    {code: "zh-TW", label: "Chinese (Traditional)"},
    {code: "ko", label: "Korean"},
    {code: "ar", label: "Arabic"},
    {code: "sv", label: "Swedish"},
    {code: "da", label: "Danish"},
    {code: "fi", label: "Finnish"},
    {code: "no", label: "Norwegian"},
    {code: "tr", label: "Turkish"},
    {code: "el", label: "Greek"},
    {code: "he", label: "Hebrew"},
    {code: "hi", label: "Hindi"},
    {code: "th", label: "Thai"},
    {code: "vi", label: "Vietnamese"},
    {code: "ro", label: "Romanian"},
    {code: "cs", label: "Czech"},
    {code: "hu", label: "Hungarian"},
];

/** Extract an external ID from Plex's Guid array (e.g. "imdb://tt1234567" → "tt1234567") */
function extractGuid(guids: Array<{ id: string }> | undefined, prefix: string): string | undefined {
    const entry = guids?.find(g => g.id.startsWith(prefix));
    return entry ? entry.id.replace(`${prefix}://`, "") : undefined;
}

export default function SubtitleSearchDrawer({isOpen, onClose, item, onUseLocally}: SubtitleSearchDrawerProps) {
    const [language, setLanguage] = useState("en");
    const [query, setQuery] = useState("");
    const [foreignOnly, setForeignOnly] = useState(false);
    const [results, setResults] = useState<SubtitleSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [uploadingId, setUploadingId] = useState<number | null>(null);

    const isEpisode = item.type === "episode";
    const imdbId = extractGuid(item.Guid, "imdb");
    const tmdbId = extractGuid(item.Guid, "tmdb");

    const search = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const results = await plexApi.searchSubtitles({
                query: query || undefined,
                imdb_id: imdbId,
                tmdb_id: tmdbId,
                // For episodes, pass the show's ratingKey so the backend can resolve
                // the show's IMDB/TMDB IDs (episode-level IDs don't work with OpenSubtitles)
                show_rating_key: isEpisode ? item.grandparentRatingKey : undefined,
                season: item.parentIndex ?? undefined,
                episode: item.index ?? undefined,
                languages: language,
                foreign_parts_only: foreignOnly || undefined,
            });
            setResults(results);
        } catch (e: any) {
            setError(e.message || "Search failed");
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [query, imdbId, tmdbId, isEpisode, item.grandparentRatingKey, item.parentIndex, item.index, language, foreignOnly]);

    // Auto-search when drawer opens or search params change
    useEffect(() => {
        if (!isOpen) return;
        search();
    }, [isOpen, language, foreignOnly]); // eslint-disable-line react-hooks/exhaustive-deps

    // Reset state when drawer closes
    useEffect(() => {
        if (!isOpen) {
            setResults([]);
            setQuery("");
            setError(null);
        }
    }, [isOpen]);

    const handleUseLocally = async (result: SubtitleSearchResult) => {
        setDownloadingId(result.file_id);
        try {
            const blobUrl = await plexApi.downloadSubtitle(result.file_id);
            const label = `${result.language.toUpperCase()} - ${result.file_name}`;
            onUseLocally(blobUrl, label);
            toast.success("Subtitle loaded");
            onClose();
        } catch (e: any) {
            toast.error(e.message || "Failed to download subtitle");
        } finally {
            setDownloadingId(null);
        }
    };

    const handleUploadToPlex = async (result: SubtitleSearchResult) => {
        setUploadingId(result.file_id);
        try {
            await plexApi.uploadSubtitleToPlex(result.file_id, item.ratingKey, result.language);
            toast.success("Subtitle uploaded to Plex");
        } catch (e: any) {
            toast.error(e.message || "Failed to upload subtitle");
        } finally {
            setUploadingId(null);
        }
    };

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            placement="bottom"
            backdrop="transparent"
            classNames={{
                base: "!max-h-[60vh]",
                wrapper: "z-[60]",
            }}
        >
            <DrawerContent>
                <DrawerHeader className="flex items-center justify-between border-b border-divider pb-3">
                    <div className="flex items-center gap-2">
                        <Icon icon="mdi:subtitles" width="24"/>
                        <span className="text-lg font-semibold">Subtitles</span>
                    </div>
                </DrawerHeader>
                <DrawerBody className="py-4">
                    {/* Controls row */}
                    <div className="flex items-end gap-3 mb-4">
                        <Select
                            label="Language"
                            selectedKeys={[language]}
                            onSelectionChange={(keys) => {
                                const val = [...keys][0] as string;
                                if (val) setLanguage(val);
                            }}
                            size="sm"
                            className="w-48"
                        >
                            {LANGUAGES.map((l) => (
                                <SelectItem key={l.code}>{l.label}</SelectItem>
                            ))}
                        </Select>
                        <Input
                            placeholder="Search subtitles..."
                            value={query}
                            onValueChange={setQuery}
                            size="sm"
                            className="flex-1"
                            onKeyDown={(e) => e.key === "Enter" && search()}
                            startContent={<Icon icon="mdi:magnify" width="18" className="text-foreground/50"/>}
                        />
                        <Button
                            size="sm"
                            variant={foreignOnly ? "solid" : "bordered"}
                            color={foreignOnly ? "primary" : "default"}
                            onPress={() => setForeignOnly(!foreignOnly)}
                            className="whitespace-nowrap"
                        >
                            Foreign Only
                        </Button>
                        <Button
                            size="sm"
                            color="primary"
                            isIconOnly
                            onPress={search}
                            isLoading={loading}
                        >
                            <Icon icon="mdi:magnify" width="18"/>
                        </Button>
                    </div>

                    {/* Results */}
                    <div className="flex-1 overflow-y-auto space-y-1">
                        {loading && results.length === 0 && (
                            <div className="flex items-center justify-center py-12">
                                <Spinner size="lg"/>
                            </div>
                        )}

                        {error && (
                            <div className="flex flex-col items-center gap-2 py-8 text-danger">
                                <Icon icon="mdi:alert-circle" width="36"/>
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {!loading && !error && results.length === 0 && (
                            <div className="flex flex-col items-center gap-2 py-8 text-foreground/50">
                                <Icon icon="mdi:subtitles-outline" width="36"/>
                                <p className="text-sm">No subtitles found</p>
                            </div>
                        )}

                        {results.map((result) => (
                            <div
                                key={`${result.subtitle_id}-${result.file_id}`}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-content2 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{result.file_name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {result.hearing_impaired && (
                                            <Chip size="sm" variant="flat" color="warning" className="h-5 text-xs">HI</Chip>
                                        )}
                                        {result.foreign_parts_only && (
                                            <Chip size="sm" variant="flat" color="secondary" className="h-5 text-xs">Foreign</Chip>
                                        )}
                                        {result.ai_translated && (
                                            <Chip size="sm" variant="flat" color="primary" className="h-5 text-xs">AI</Chip>
                                        )}
                                    </div>
                                </div>
                                <span className="text-xs text-foreground/50 whitespace-nowrap">
                                    {result.download_count.toLocaleString()}
                                </span>
                                <Button
                                    size="sm"
                                    variant="flat"
                                    color="primary"
                                    onPress={() => handleUseLocally(result)}
                                    isLoading={downloadingId === result.file_id}
                                    isDisabled={downloadingId !== null || uploadingId !== null}
                                >
                                    Use
                                </Button>
                                <Button
                                    size="sm"
                                    variant="flat"
                                    color="success"
                                    onPress={() => handleUploadToPlex(result)}
                                    isLoading={uploadingId === result.file_id}
                                    isDisabled={downloadingId !== null || uploadingId !== null}
                                >
                                    Upload to Plex
                                </Button>
                            </div>
                        ))}
                    </div>
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    );
}
