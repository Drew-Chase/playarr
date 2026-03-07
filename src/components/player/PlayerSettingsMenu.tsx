import {Button, Chip} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {AnimatePresence, motion} from "framer-motion";
import {useEffect, useRef, useState} from "react";
import type {PlexStream} from "../../lib/types.ts";

// ── Quality data ────────────────────────────────────────────────

export interface QualityVariant {
    key: string;
    label: string;
    bitrate: string;
}

export interface QualityGroup {
    resolution: string;
    label: string;
    description?: string;
    variants: QualityVariant[];
}

export const QUALITY_GROUPS: QualityGroup[] = [
    {resolution: "original", label: "Original", variants: []},
    {resolution: "1080p", label: "1080p", variants: [
        {key: "1080p-high", label: "High", bitrate: "20 Mbps"},
        {key: "1080p-medium", label: "Med", bitrate: "12 Mbps"},
        {key: "1080p", label: "Normal", bitrate: "10 Mbps"},
        {key: "1080p-low", label: "Low", bitrate: "8 Mbps"},
    ]},
    {resolution: "720p", label: "720p", variants: [
        {key: "720p-high", label: "High", bitrate: "4 Mbps"},
        {key: "720p-medium", label: "Med", bitrate: "3 Mbps"},
        {key: "720p", label: "Normal", bitrate: "2 Mbps"},
    ]},
    {resolution: "480p", label: "480p", variants: [
        {key: "480p", label: "", bitrate: "1.5 Mbps"},
    ]},
    {resolution: "360p", label: "360p", variants: [
        {key: "360p", label: "", bitrate: "0.7 Mbps"},
    ]},
];

export const ALL_QUALITY_KEYS = QUALITY_GROUPS.flatMap(g =>
    g.variants.length > 0 ? g.variants.map(v => v.key) : [g.resolution]
);

// ── Helpers ─────────────────────────────────────────────────────

function isInGroup(quality: string, group: QualityGroup): boolean {
    if (group.variants.length === 0) return quality === group.resolution;
    return group.variants.some(v => v.key === quality);
}

/** Get a human-readable label for the current quality key */
function qualityLabel(quality: string, groups: QualityGroup[]): string {
    for (const g of groups) {
        if (g.variants.length === 0 && g.resolution === quality) return g.label;
        const v = g.variants.find(v => v.key === quality);
        if (v) return v.label ? `${g.label} ${v.label}` : g.label;
    }
    return quality;
}

// ── Animation variants ──────────────────────────────────────────

type PanelId = "main" | "subtitles" | "audio" | "quality";

const SLIDE_DISTANCE = 320;

const panelVariants = {
    enter: (dir: number) => ({x: dir > 0 ? SLIDE_DISTANCE : -SLIDE_DISTANCE, opacity: 0}),
    center: {x: 0, opacity: 1},
    exit: (dir: number) => ({x: dir > 0 ? -SLIDE_DISTANCE : SLIDE_DISTANCE, opacity: 0}),
};

// ── Component ───────────────────────────────────────────────────

interface PlayerSettingsMenuProps {
    subtitleStreams: PlexStream[];
    audioStreams: PlexStream[];
    quality: string;
    qualityGroups?: QualityGroup[];
    onQualityChange: (q: string) => void;
    onSubtitleSelect?: (streamId: number | null) => void;
    onAudioSelect?: (streamId: number) => void;
}

export default function PlayerSettingsMenu({
    subtitleStreams,
    audioStreams,
    quality,
    qualityGroups,
    onQualityChange,
    onSubtitleSelect,
    onAudioSelect,
}: PlayerSettingsMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activePanel, setActivePanel] = useState<PanelId>("main");
    const dirRef = useRef(1); // 1 = forward, -1 = back
    const menuRef = useRef<HTMLDivElement>(null);

    const groups = qualityGroups ?? QUALITY_GROUPS;

    const goTo = (panel: PanelId) => {
        dirRef.current = 1;
        setActivePanel(panel);
    };

    const goBack = () => {
        dirRef.current = -1;
        setActivePanel("main");
    };

    const handleToggle = () => {
        setIsOpen(prev => {
            if (prev) setActivePanel("main");
            return !prev;
        });
    };

    const selectQuality = (key: string) => {
        onQualityChange(key);
        setIsOpen(false);
        setActivePanel("main");
    };

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setActivePanel("main");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsOpen(false);
                setActivePanel("main");
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [isOpen]);

    // Derive current subtitle/audio display text
    const currentSubtitle = subtitleStreams.find(s => s.selected)?.displayTitle ?? "None";
    const currentAudio = audioStreams.find(s => s.selected)?.displayTitle
        ?? audioStreams[0]?.displayTitle ?? "Default";

    return (
        <div ref={menuRef} className="relative">
            <Button isIconOnly variant="light" size="sm" className="text-white" onPress={handleToggle}>
                <Icon icon="mdi:cog" width="20"/>
            </Button>

            {isOpen && (
                <div
                    className={`absolute bottom-[calc(100%+8px)] right-0 z-[100000] rounded-large bg-content1 shadow-medium overflow-hidden transition-[width] duration-200 max-h-[min(400px,60vh)] ${
                        activePanel === "quality" ? "w-[320px]" : "w-[240px]"
                    }`}
                >
                    <AnimatePresence mode="popLayout" custom={dirRef.current}>
                        {activePanel === "main" && (
                            <motion.div
                                key="main"
                                custom={dirRef.current}
                                variants={panelVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{duration: 0.2, ease: "easeInOut"}}
                                className="p-1.5"
                            >
                                <MainPanel
                                    subtitleStreams={subtitleStreams}
                                    audioStreams={audioStreams}
                                    currentSubtitle={currentSubtitle}
                                    currentAudio={currentAudio}
                                    currentQuality={qualityLabel(quality, groups)}
                                    onGoTo={goTo}
                                />
                            </motion.div>
                        )}

                        {activePanel === "subtitles" && (
                            <motion.div
                                key="subtitles"
                                custom={dirRef.current}
                                variants={panelVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{duration: 0.2, ease: "easeInOut"}}
                                className="p-1.5"
                            >
                                <SubPanel title="Subtitles" onBack={goBack}>
                                    <TrackList
                                        streams={subtitleStreams}
                                        showNone
                                        onSelect={onSubtitleSelect}
                                    />
                                </SubPanel>
                            </motion.div>
                        )}

                        {activePanel === "audio" && (
                            <motion.div
                                key="audio"
                                custom={dirRef.current}
                                variants={panelVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{duration: 0.2, ease: "easeInOut"}}
                                className="p-1.5"
                            >
                                <SubPanel title="Audio" onBack={goBack}>
                                    <TrackList
                                        streams={audioStreams}
                                        onSelect={(id) => { if (id != null) onAudioSelect?.(id); }}
                                    />
                                </SubPanel>
                            </motion.div>
                        )}

                        {activePanel === "quality" && (
                            <motion.div
                                key="quality"
                                custom={dirRef.current}
                                variants={panelVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{duration: 0.2, ease: "easeInOut"}}
                                className="p-1.5"
                            >
                                <SubPanel title="Quality" onBack={goBack}>
                                    <QualityPanel
                                        quality={quality}
                                        groups={groups}
                                        onSelect={selectQuality}
                                    />
                                </SubPanel>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

// ── Sub-components ──────────────────────────────────────────────

function MainPanel({
    subtitleStreams,
    audioStreams,
    currentSubtitle,
    currentAudio,
    currentQuality,
    onGoTo,
}: {
    subtitleStreams: PlexStream[];
    audioStreams: PlexStream[];
    currentSubtitle: string;
    currentAudio: string;
    currentQuality: string;
    onGoTo: (panel: PanelId) => void;
}) {
    return (
        <div className="flex flex-col">
            {subtitleStreams.length > 0 && (
                <MenuRow
                    icon="mdi:subtitles"
                    label="Subtitles"
                    value={currentSubtitle}
                    onClick={() => onGoTo("subtitles")}
                />
            )}
            {audioStreams.length > 1 && (
                <MenuRow
                    icon="mdi:speaker"
                    label="Audio"
                    value={currentAudio}
                    onClick={() => onGoTo("audio")}
                />
            )}
            <MenuRow
                icon="mdi:quality-high"
                label="Quality"
                value={currentQuality}
                onClick={() => onGoTo("quality")}
            />
        </div>
    );
}

function MenuRow({icon, label, value, onClick}: {
    icon: string;
    label: string;
    value?: string;
    onClick: () => void;
}) {
    return (
        <button
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-default-100 transition-colors w-full text-left"
            onClick={onClick}
        >
            <Icon icon={icon} width="18" className="text-default-500 shrink-0"/>
            <span className="font-medium flex-1">{label}</span>
            {value && (
                <span className="text-xs text-default-400 truncate max-w-[100px]">{value}</span>
            )}
            <Icon icon="mdi:chevron-right" width="16" className="text-default-400 shrink-0"/>
        </button>
    );
}

function SubPanel({title, onBack, children}: {
    title: string;
    onBack: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col">
            <button
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-default-100 transition-colors text-sm font-medium mb-0.5"
                onClick={onBack}
            >
                <Icon icon="mdi:chevron-left" width="18"/>
                {title}
            </button>
            <div className="border-t border-default-200 pt-1">
                {children}
            </div>
        </div>
    );
}

function TrackList({streams, showNone, onSelect}: {
    streams: PlexStream[];
    showNone?: boolean;
    onSelect?: (streamId: number | null) => void;
}) {
    const noneSelected = !streams.some(s => s.selected);
    return (
        <div className="flex flex-col max-h-[min(280px,50vh)] overflow-y-auto">
            {showNone && (
                <TrackRow label="None" selected={noneSelected} onClick={() => onSelect?.(null)}/>
            )}
            {streams.map((stream) => {
                // Build label: "Language (CODEC)" for subtitles, displayTitle for audio
                const codec = stream.codec?.toUpperCase();
                const label = stream.streamType === 3 && codec
                    ? `${stream.displayTitle || stream.language || `Track ${stream.id}`} (${codec})`
                    : stream.displayTitle || stream.language || `Track ${stream.id}`;
                // Show title as secondary line if it differs from displayTitle
                const detail = stream.streamType === 3 && stream.title ? stream.title : undefined;

                return (
                    <TrackRow
                        key={stream.id}
                        label={label}
                        detail={detail}
                        selected={!!stream.selected}
                        onClick={() => onSelect?.(stream.id)}
                    />
                );
            })}
        </div>
    );
}

function TrackRow({label, detail, selected, onClick}: {
    label: string;
    detail?: string;
    selected: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm w-full text-left transition-colors
                ${selected ? "text-primary" : "hover:bg-default-100"}`}
            onClick={onClick}
        >
            <span className="w-4 shrink-0">
                {selected && <Icon icon="mdi:check" width="16"/>}
            </span>
            <div className="flex flex-col min-w-0">
                <span className="truncate">{label}</span>
                {detail && <span className="text-xs text-default-400 truncate">{detail}</span>}
            </div>
        </button>
    );
}

function QualityPanel({quality, groups, onSelect}: {
    quality: string;
    groups: QualityGroup[];
    onSelect: (key: string) => void;
}) {
    return (
        <div className="flex flex-col gap-0.5 max-h-[min(300px,50vh)] overflow-y-auto">
            {groups.map((group) => {
                const isActive = isInGroup(quality, group);

                // Original or single-variant: simple clickable row
                if (group.variants.length <= 1) {
                    const key = group.variants[0]?.key ?? group.resolution;
                    const bitrate = group.variants[0]?.bitrate;
                    return (
                        <button
                            key={group.resolution}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left
                                ${isActive ? "bg-primary/20 text-primary" : "hover:bg-default-100"}`}
                            onClick={() => onSelect(key)}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="w-4 shrink-0">
                                    {isActive && <Icon icon="mdi:check" width="16"/>}
                                </span>
                                <span className="font-medium">{group.label}</span>
                            </div>
                            <span className="text-xs text-default-400 ml-2">
                                {group.description ?? bitrate}
                            </span>
                        </button>
                    );
                }

                // Multi-variant: resolution label + bitrate chips
                return (
                    <div
                        key={group.resolution}
                        className={`px-2.5 py-1.5 rounded-lg transition-colors
                            ${isActive ? "bg-primary/10" : ""}`}
                    >
                        <div className="flex items-center gap-2.5 mb-1">
                            <span className="w-4 shrink-0">
                                {isActive && <Icon icon="mdi:check" width="16" className="text-primary"/>}
                            </span>
                            <span className={`text-sm font-medium ${isActive ? "text-primary" : ""}`}>
                                {group.label}
                            </span>
                        </div>
                        <div className="flex gap-1 flex-wrap ml-[26px]">
                            {group.variants.map((v) => (
                                <Chip
                                    key={v.key}
                                    size="sm"
                                    variant={quality === v.key ? "solid" : "flat"}
                                    color={quality === v.key ? "primary" : "default"}
                                    className="cursor-pointer text-[11px] h-5"
                                    onClick={() => onSelect(v.key)}
                                >
                                    {v.label ? `${v.label} ${v.bitrate}` : v.bitrate}
                                </Chip>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
