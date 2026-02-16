import {Avatar, AvatarGroup, Popover, PopoverTrigger, PopoverContent, Spinner} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import type {WatchPartyParticipant} from "../../lib/types.ts";

interface ParticipantsPopoverProps {
    participants: WatchPartyParticipant[];
    hostUserId: number;
    bufferingUsers?: Set<number>;
}

export default function ParticipantsPopover({participants, hostUserId, bufferingUsers}: ParticipantsPopoverProps) {
    return (
        <Popover placement="top">
            <PopoverTrigger>
                <button className="flex items-center gap-1 cursor-pointer">
                    <AvatarGroup max={3} size="sm">
                        {participants.map(p => {
                            const isBuffering = bufferingUsers?.has(p.user_id);
                            return (
                                <div key={p.user_id} className="relative inline-flex">
                                    <Avatar
                                        src={p.thumb || undefined}
                                        name={p.username}
                                        size="sm"
                                        className={isBuffering ? "opacity-50" : ""}
                                    />
                                    {isBuffering && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Spinner size="sm" color="warning"/>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </AvatarGroup>
                </button>
            </PopoverTrigger>
            <PopoverContent className="p-3">
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground/70 uppercase">
                        Watching ({participants.length})
                    </p>
                    {participants.map(p => {
                        const isBuffering = bufferingUsers?.has(p.user_id);
                        return (
                            <div key={p.user_id} className="flex items-center gap-2">
                                <div className="relative">
                                    <Avatar
                                        src={p.thumb || undefined}
                                        name={p.username}
                                        size="sm"
                                        className={isBuffering ? "opacity-50" : ""}
                                    />
                                    {isBuffering && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Spinner size="sm" color="warning"/>
                                        </div>
                                    )}
                                </div>
                                <span className="text-sm">{p.username}</span>
                                {isBuffering && (
                                    <span className="text-xs text-warning">Buffering</span>
                                )}
                                {p.user_id === hostUserId && (
                                    <Icon icon="mdi:crown" width="14" className="text-warning"/>
                                )}
                            </div>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}
