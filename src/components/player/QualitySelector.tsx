import {Button, Chip, Popover, PopoverContent, PopoverTrigger} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useState} from "react";

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

// Flat list of all valid quality keys (for localStorage validation)
export const ALL_QUALITY_KEYS = QUALITY_GROUPS.flatMap(g =>
    g.variants.length > 0 ? g.variants.map(v => v.key) : [g.resolution]
);

interface QualitySelectorProps {
    quality: string;
    groups?: QualityGroup[];
    onQualityChange: (q: string) => void;
}

/** Check if a quality key belongs to a resolution group */
function isInGroup(quality: string, group: QualityGroup): boolean {
    if (group.variants.length === 0) return quality === group.resolution;
    return group.variants.some(v => v.key === quality);
}

export default function QualitySelector({quality, groups, onQualityChange}: QualitySelectorProps) {
    const items = groups ?? QUALITY_GROUPS;
    const [isOpen, setIsOpen] = useState(false);

    const select = (key: string) => {
        onQualityChange(key);
        setIsOpen(false);
    };

    return (
        <Popover isOpen={isOpen} onOpenChange={setIsOpen} placement="top">
            <PopoverTrigger>
                <Button isIconOnly variant="light" size="sm" className="text-white">
                    <Icon icon="mdi:quality-high" width="20"/>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-2 min-w-[200px]">
                <div className="flex flex-col gap-0.5">
                    {items.map((group) => {
                        const isActive = isInGroup(quality, group);

                        // Original or single-variant: simple clickable row
                        if (group.variants.length <= 1) {
                            const key = group.variants[0]?.key ?? group.resolution;
                            const bitrate = group.variants[0]?.bitrate;
                            return (
                                <button
                                    key={group.resolution}
                                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors text-left
                                        ${isActive ? "bg-primary/20 text-primary" : "hover:bg-default-100"}`}
                                    onClick={() => select(key)}
                                >
                                    <span className="font-medium">{group.label}</span>
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
                                className={`px-3 py-1.5 rounded-lg transition-colors
                                    ${isActive ? "bg-primary/10" : ""}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`text-sm font-medium ${isActive ? "text-primary" : ""}`}>
                                        {group.label}
                                    </span>
                                </div>
                                <div className="flex gap-1 flex-wrap">
                                    {group.variants.map((v) => (
                                        <Chip
                                            key={v.key}
                                            size="sm"
                                            variant={quality === v.key ? "solid" : "flat"}
                                            color={quality === v.key ? "primary" : "default"}
                                            className="cursor-pointer text-[11px] h-5"
                                            onClick={() => select(v.key)}
                                        >
                                            {v.label ? `${v.label} ${v.bitrate}` : v.bitrate}
                                        </Chip>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}
