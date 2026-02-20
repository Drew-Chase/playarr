import {useParams} from "react-router-dom";
import {
    Button,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Spinner,
} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useQuery, keepPreviousData} from "@tanstack/react-query";
import {plexApi} from "../lib/plex.ts";
import {useLibraries} from "../hooks/usePlex.ts";
import MediaCard from "../components/media/MediaCard.tsx";

const SORT_OPTIONS = [
    {key: "titleSort", label: "Title", defaultDir: "asc" as const},
    {key: "year", label: "Year", defaultDir: "desc" as const},
    {key: "originallyAvailableAt", label: "Release Date", defaultDir: "desc" as const},
    {key: "rating", label: "Critic Rating", defaultDir: "desc" as const},
    {key: "audienceRating", label: "Audience Rating", defaultDir: "desc" as const},
    {key: "contentRating", label: "Content Rating", defaultDir: "asc" as const},
    {key: "duration", label: "Duration", defaultDir: "desc" as const},
    {key: "addedAt", label: "Date Added", defaultDir: "desc" as const},
    {key: "lastViewedAt", label: "Date Viewed", defaultDir: "desc" as const},
    {key: "mediaHeight", label: "Resolution", defaultDir: "desc" as const},
    {key: "mediaBitrate", label: "Bitrate", defaultDir: "desc" as const},
    {key: "random", label: "Randomly", defaultDir: "asc" as const},
];

const FILTER_OPTIONS = [
    {key: "all", label: "All"},
    {key: "unwatched", label: "Unwatched"},
    {key: "in_progress", label: "In Progress"},
];

const ALPHABET = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

export default function Library() {
    const {key} = useParams<{ key: string }>();
    const {data: libraries} = useLibraries();
    const library = libraries?.find(l => l.key === key);

    const [sort, setSort] = useState("titleSort");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [filter, setFilter] = useState("all");
    const [activeLetter, setActiveLetter] = useState<string | null>(null);

    // Reset state when switching libraries
    useEffect(() => {
        setSort("titleSort");
        setSortDir("asc");
        setFilter("all");
    }, [key]);

    const sortParam = sort === "random" ? "" : `${sort}:${sortDir}`;

    // Fetch all items at once for client-side filtering and alphabet navigation.
    // keepPreviousData prevents flicker on sort changes, but we don't want stale
    // items from a different library showing while the new one loads.
    // Track which library key the current data belongs to so we can show a spinner
    // when switching libraries instead of displaying stale items.
    const dataKeyRef = useRef<string | undefined>(undefined);

    const {data, isLoading, isPlaceholderData} = useQuery({
        queryKey: ["plex", "library", key, "all", sortParam],
        queryFn: () => plexApi.getLibraryItems(key!, 0, 100000, sortParam || undefined),
        enabled: !!key,
        placeholderData: keepPreviousData,
    });

    // When fresh (non-placeholder) data arrives, record which library it's for
    if (data && !isPlaceholderData) dataKeyRef.current = key;

    const showSpinner = isLoading || (isPlaceholderData && dataKeyRef.current !== key);

    // Client-side filtering
    const filteredItems = useMemo(() => {
        if (!data?.items) return [];
        switch (filter) {
            case "unwatched":
                return data.items.filter(i => !i.viewCount || i.viewCount === 0);
            case "in_progress":
                return data.items.filter(i => i.viewOffset && i.viewOffset > 0);
            default:
                return data.items;
        }
    }, [data?.items, filter]);

    // Build letter → first item ratingKey map for alphabet sidebar
    const letterMap = useMemo(() => {
        if (sort !== "titleSort") return null;
        const map = new Map<string, string>();
        for (const item of filteredItems) {
            const ch = (item.titleSort || item.title).charAt(0).toUpperCase();
            const letter = /[A-Z]/.test(ch) ? ch : "#";
            if (!map.has(letter)) map.set(letter, item.ratingKey);
        }
        return map;
    }, [filteredItems, sort]);

    // Track which letter is currently in view
    const observerRef = useRef<IntersectionObserver | null>(null);
    const letterAnchorsRef = useRef<Map<string, HTMLElement>>(new Map());

    useEffect(() => {
        if (!letterMap) return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                // Find the topmost visible anchor
                const visible = entries
                    .filter(e => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible.length > 0) {
                    const letter = visible[0].target.getAttribute("data-letter");
                    if (letter) setActiveLetter(letter);
                }
            },
            {rootMargin: "-80px 0px -80% 0px"},
        );

        for (const el of letterAnchorsRef.current.values()) {
            observerRef.current.observe(el);
        }

        return () => {
            observerRef.current?.disconnect();
        };
    }, [letterMap, filteredItems]);

    const registerAnchor = useCallback((letter: string, el: HTMLElement | null) => {
        if (el) {
            letterAnchorsRef.current.set(letter, el);
            observerRef.current?.observe(el);
        } else {
            const prev = letterAnchorsRef.current.get(letter);
            if (prev) observerRef.current?.unobserve(prev);
            letterAnchorsRef.current.delete(letter);
        }
    }, []);

    const scrollToLetter = useCallback((letter: string) => {
        const el = letterAnchorsRef.current.get(letter);
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({top: y, behavior: "smooth"});
        }
    }, []);

    const handleSortChange = (newSort: string) => {
        if (newSort === sort) return;
        const option = SORT_OPTIONS.find(o => o.key === newSort);
        setSort(newSort);
        if (option) setSortDir(option.defaultDir);
        window.scrollTo({top: 0});
    };

    const sortLabel = SORT_OPTIONS.find(o => o.key === sort)?.label || "Title";
    const filterLabel = FILTER_OPTIONS.find(o => o.key === filter)?.label || "All";

    return (
        <div className="relative">
            <div className={`px-6 md:px-12 lg:px-16 py-6 ${letterMap ? "mr-6" : ""}`}>
                {/* Library header */}
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-xl font-bold">{library?.title || "Library"}</h1>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-1 mb-6">
                    {/* Filter dropdown */}
                    <Dropdown>
                        <DropdownTrigger>
                            <Button
                                variant="light"
                                size="sm"
                                endContent={<Icon icon="mdi:chevron-down" width="16"/>}
                                className="text-default-600"
                            >
                                {filterLabel}
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                            selectionMode="single"
                            selectedKeys={new Set([filter])}
                            onSelectionChange={(keys) => {
                                const selected = [...keys][0] as string;
                                if (selected) {
                                    setFilter(selected);
                                    window.scrollTo({top: 0});
                                }
                            }}
                        >
                            {FILTER_OPTIONS.map(opt => (
                                <DropdownItem key={opt.key}>{opt.label}</DropdownItem>
                            ))}
                        </DropdownMenu>
                    </Dropdown>

                    {/* Sort dropdown */}
                    <Dropdown>
                        <DropdownTrigger>
                            <Button
                                variant="light"
                                size="sm"
                                endContent={<Icon icon="mdi:chevron-down" width="16"/>}
                                className="text-default-600"
                            >
                                {sortLabel}
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                            selectionMode="single"
                            selectedKeys={new Set([sort])}
                            onSelectionChange={(keys) => {
                                const selected = [...keys][0] as string;
                                if (selected) handleSortChange(selected);
                            }}
                        >
                            {SORT_OPTIONS.map(opt => (
                                <DropdownItem key={opt.key}>{opt.label}</DropdownItem>
                            ))}
                        </DropdownMenu>
                    </Dropdown>

                    {/* Sort direction toggle */}
                    {sort !== "random" && (
                        <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                            className="text-default-500"
                        >
                            <Icon icon={sortDir === "asc" ? "mdi:sort-ascending" : "mdi:sort-descending"} width="18"/>
                        </Button>
                    )}

                    {/* Total count */}
                    <span className="text-sm text-default-400 ml-2">
                        {filteredItems.length}
                    </span>
                </div>

                {/* Content */}
                {showSpinner ? (
                    <div className="flex justify-center items-center h-64">
                        <Spinner size="lg"/>
                    </div>
                ) : filteredItems.length > 0 ? (
                    <div
                        className="grid gap-4"
                        style={{gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))"}}
                    >
                        {filteredItems.map((item) => {
                            let anchor: string | undefined;
                            if (letterMap) {
                                const ch = (item.titleSort || item.title).charAt(0).toUpperCase();
                                const letter = /[A-Z]/.test(ch) ? ch : "#";
                                if (letterMap.get(letter) === item.ratingKey) {
                                    anchor = letter;
                                }
                            }
                            return (
                                <div
                                    key={item.ratingKey}
                                    ref={anchor ? (el) => registerAnchor(anchor, el) : undefined}
                                    data-letter={anchor || undefined}
                                >
                                    <MediaCard item={item} width={250} variant={"portrait"}/>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <Icon icon="mdi:movie-open-outline" width="48" className="text-default-300 mx-auto mb-3"/>
                        <p className="text-default-400">No items found</p>
                    </div>
                )}
            </div>

            {/* Alphabet sidebar */}
            {letterMap && (
                <div className="fixed right-1 top-1/2 -translate-y-1/2 flex flex-col items-center z-30 select-none">
                    {ALPHABET.map(letter => {
                        const hasItems = letterMap.has(letter);
                        const isActive = activeLetter === letter;
                        return (
                            <button
                                key={letter}
                                disabled={!hasItems}
                                onClick={() => scrollToLetter(letter)}
                                className={`text-[11px] leading-[1.6] px-1 transition-colors ${
                                    isActive
                                        ? "text-primary font-bold"
                                        : hasItems
                                            ? "text-default-500 hover:text-primary"
                                            : "text-default-300 cursor-default"
                                }`}
                            >
                                {letter}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
