import {Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger} from "@heroui/react";
import {Icon} from "@iconify-icon/react";

const QUALITY_OPTIONS = [
    {key: "original", label: "Original"},
    {key: "1080p", label: "1080p"},
    {key: "720p", label: "720p"},
    {key: "480p", label: "480p"},
];

interface QualitySelectorProps {
    quality: string;
    onQualityChange: (q: string) => void;
}

export default function QualitySelector({quality, onQualityChange}: QualitySelectorProps) {
    return (
        <Dropdown>
            <DropdownTrigger>
                <Button isIconOnly variant="light" size="sm" className="text-white">
                    <Icon icon="mdi:quality-high" width="20"/>
                </Button>
            </DropdownTrigger>
            <DropdownMenu
                aria-label="Quality"
                selectedKeys={[quality]}
                selectionMode="single"
                onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    if (selected) onQualityChange(selected);
                }}
            >
                {QUALITY_OPTIONS.map((opt) => (
                    <DropdownItem key={opt.key}>{opt.label}</DropdownItem>
                ))}
            </DropdownMenu>
        </Dropdown>
    );
}
