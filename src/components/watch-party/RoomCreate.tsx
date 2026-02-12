import {Button, Input} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useState} from "react";
import {api} from "../../lib/api.ts";
import type {WatchRoom} from "../../lib/types.ts";

interface RoomCreateProps {
    onRoomCreated: (roomId: string) => void;
}

export default function RoomCreate({onRoomCreated}: RoomCreateProps) {
    const [hostName, setHostName] = useState("");
    const [joinRoomId, setJoinRoomId] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!hostName.trim()) return;
        setIsCreating(true);
        try {
            const room = await api.post<WatchRoom>("/watch-party/rooms", {
                hostName: hostName.trim(),
                mediaId: "",
            });
            onRoomCreated(room.id);
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoin = () => {
        if (joinRoomId.trim()) {
            onRoomCreated(joinRoomId.trim());
        }
    };

    return (
        <div className="max-w-md mx-auto py-12">
            <h1 className="text-2xl font-bold mb-6 text-center">Watch Together</h1>

            <div className="bg-content2 rounded-xl p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Create a Room</h2>
                <Input
                    label="Your Name"
                    value={hostName}
                    onValueChange={setHostName}
                    className="mb-4"
                />
                <Button
                    color="primary"
                    className="w-full"
                    onPress={handleCreate}
                    isLoading={isCreating}
                    startContent={!isCreating ? <Icon icon="mdi:plus" width="20"/> : undefined}
                >
                    Create Room
                </Button>
            </div>

            <div className="bg-content2 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Join a Room</h2>
                <Input
                    label="Room ID"
                    value={joinRoomId}
                    onValueChange={setJoinRoomId}
                    className="mb-4"
                />
                <Button
                    color="secondary"
                    variant="flat"
                    className="w-full"
                    onPress={handleJoin}
                    startContent={<Icon icon="mdi:account-group" width="20"/>}
                >
                    Join Room
                </Button>
            </div>
        </div>
    );
}
