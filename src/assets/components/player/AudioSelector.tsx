import {Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import type {PlexStream} from "../../lib/types";

interface AudioSelectorProps {
    streams: PlexStream[];
}

export default function AudioSelector({streams}: AudioSelectorProps) {
    return (
        <Dropdown>
            <DropdownTrigger>
                <Button isIconOnly variant="light" size="sm" className="text-white">
                    <Icon icon="mdi:speaker" width="20"/>
                </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Audio tracks">
                {streams.map((stream) => (
                    <DropdownItem key={stream.id}>
                        {stream.displayTitle || stream.language || `Track ${stream.id}`}
                    </DropdownItem>
                )) as any}
            </DropdownMenu>
        </Dropdown>
    );
}
