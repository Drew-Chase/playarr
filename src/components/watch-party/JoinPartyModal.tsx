import {useState} from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    Button,
    Input,
    Card,
    CardBody,
    Avatar,
    AvatarGroup,
    Chip,
    Progress,
    Spinner,
    Tooltip,
} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useQuery} from "@tanstack/react-query";
import {useWatchPartyContext} from "../../providers/WatchPartyProvider.tsx";
import {api} from "../../lib/api.ts";
import {formatTimestamp} from "../../lib/utils.ts";
import type {WatchRoom} from "../../lib/types.ts";

interface JoinPartyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function JoinPartyModal({isOpen, onClose}: JoinPartyModalProps) {
    const watchParty = useWatchPartyContext();
    const [inviteCode, setInviteCode] = useState("");
    const [isJoining, setIsJoining] = useState(false);

    const {data: rooms, isLoading} = useQuery({
        queryKey: ["watchPartyRooms"],
        queryFn: () => api.get<WatchRoom[]>("/watch-party/rooms"),
        enabled: isOpen,
        refetchInterval: 1000,
    });

    const handleJoinRoom = async (roomId: string) => {
        if (!watchParty) return;
        setIsJoining(true);
        try {
            await watchParty.joinParty(roomId);
            handleClose();
        } catch {
            // handled by api
        } finally {
            setIsJoining(false);
        }
    };

    const handleJoinByCode = async () => {
        if (!watchParty || !inviteCode.trim()) return;
        setIsJoining(true);
        try {
            const room = await api.get<WatchRoom>(`/watch-party/join/${inviteCode.trim().toUpperCase()}`);
            await watchParty.joinParty(room.id);
            handleClose();
        } catch {
            // handled by api
        } finally {
            setIsJoining(false);
        }
    };

    const handleClose = () => {
        setInviteCode("");
        setIsJoining(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="2xl" backdrop="blur" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader className="flex items-center gap-2">
                    <Icon icon="mdi:account-group" width="24" className="text-primary"/>
                    Join Watch Party
                </ModalHeader>
                <ModalBody className="gap-4 pb-6">
                    <div className="flex gap-2">
                        <Input
                            size="sm"
                            placeholder="Enter invite code..."
                            value={inviteCode}
                            onValueChange={setInviteCode}
                            startContent={<Icon icon="mdi:ticket" width="16"/>}
                            onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
                        />
                        <Button
                            size="sm"
                            color="primary"
                            onPress={handleJoinByCode}
                            isLoading={isJoining}
                            isDisabled={!inviteCode.trim()}
                        >
                            Join
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-8"><Spinner/></div>
                    ) : !rooms || rooms.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-foreground/50">
                            <Icon icon="mdi:account-group-outline" width="48"/>
                            <p className="text-sm">No watch parties available</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {rooms.map(room => (
                                <Card
                                    key={room.id}
                                    isPressable
                                    onPress={() => handleJoinRoom(room.id)}
                                    className="bg-content2"
                                >
                                    <CardBody className="gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">
                                                    {room.name || `${room.host_username}'s Party`}
                                                </p>
                                                <p className="text-xs text-foreground/50">
                                                    Hosted by {room.host_username}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <AvatarGroup max={4} size="sm">
                                                    {room.participants.map(p => (
                                                        <Avatar
                                                            key={p.user_id}
                                                            src={p.thumb || undefined}
                                                            name={p.username}
                                                            size="sm"
                                                        />
                                                    ))}
                                                </AvatarGroup>
                                                <StatusChip room={room}/>
                                            </div>
                                        </div>
                                        {(room.status === "watching" || room.status === "paused") && room.duration_ms > 0 && (
                                            <Tooltip
                                                content={`${formatTimestamp(room.position_ms)} / ${formatTimestamp(room.duration_ms)}`}
                                            >
                                                <Progress
                                                    size="sm"
                                                    value={(room.position_ms / room.duration_ms) * 100}
                                                    color={room.status === "watching" ? "primary" : "warning"}
                                                    className="w-full"
                                                />
                                            </Tooltip>
                                        )}
                                    </CardBody>
                                </Card>
                            ))}
                        </div>
                    )}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}

function StatusChip({room}: { room: WatchRoom }) {
    switch (room.status) {
        case "watching":
            return (
                <Chip
                    size="sm"
                    color="success"
                    variant="flat"
                    startContent={<Icon icon="mdi:play" width="14"/>}
                >
                    {room.media_title ? (
                        <span className="max-w-24 truncate inline-block align-bottom">{room.media_title}</span>
                    ) : "Watching"}
                </Chip>
            );
        case "paused":
            return (
                <Chip
                    size="sm"
                    color="warning"
                    variant="flat"
                    startContent={<Icon icon="mdi:pause" width="14"/>}
                >
                    Paused
                </Chip>
            );
        default:
            return (
                <Chip
                    size="sm"
                    color="default"
                    variant="flat"
                    startContent={<Icon icon="mdi:clock-outline" width="14"/>}
                >
                    Idle
                </Chip>
            );
    }
}
