import {Avatar, AvatarGroup, Popover, PopoverTrigger, PopoverContent} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import type {WatchPartyParticipant} from "../../lib/types.ts";

interface ParticipantsPopoverProps {
    participants: WatchPartyParticipant[];
    hostUserId: number;
}

export default function ParticipantsPopover({participants, hostUserId}: ParticipantsPopoverProps) {
    return (
        <Popover placement="top">
            <PopoverTrigger>
                <button className="flex items-center gap-1 cursor-pointer">
                    <AvatarGroup max={3} size="sm">
                        {participants.map(p => (
                            <Avatar
                                key={p.user_id}
                                src={p.thumb || undefined}
                                name={p.username}
                                size="sm"
                            />
                        ))}
                    </AvatarGroup>
                </button>
            </PopoverTrigger>
            <PopoverContent className="p-3">
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground/70 uppercase">
                        Watching ({participants.length})
                    </p>
                    {participants.map(p => (
                        <div key={p.user_id} className="flex items-center gap-2">
                            <Avatar src={p.thumb || undefined} name={p.username} size="sm"/>
                            <span className="text-sm">{p.username}</span>
                            {p.user_id === hostUserId && (
                                <Icon icon="mdi:crown" width="14" className="text-warning"/>
                            )}
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
