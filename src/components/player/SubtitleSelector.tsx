import {Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import type {PlexStream} from "../../lib/types.ts";

interface SubtitleSelectorProps {
    streams: PlexStream[];
}

export default function SubtitleSelector({streams}: SubtitleSelectorProps) {
    return (
        <Dropdown>
            <DropdownTrigger>
                <Button isIconOnly variant="light" size="sm" className="text-white">
                    <Icon icon="mdi:subtitles" width="20"/>
                </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Subtitle tracks">
                <DropdownItem key="none">None</DropdownItem>
                {streams.map((stream) => (
                    <DropdownItem key={stream.id}>
                        {stream.displayTitle || stream.language || `Track ${stream.id}`}
                    </DropdownItem>
                )) as any}
            </DropdownMenu>
        </Dropdown>
    );
}
