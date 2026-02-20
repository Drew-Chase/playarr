import {Avatar, AvatarGroup, Button} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {motion} from "framer-motion";
import {useNavigate} from "react-router-dom";
import {useWatchPartyContext} from "../../providers/WatchPartyProvider.tsx";

export default function WatchPartyOverlay() {
    const watchParty = useWatchPartyContext();
    if (!watchParty?.isInParty || !watchParty.activeRoom) return null;

    const {activeRoom, leaveParty} = watchParty;
    const navigate = useNavigate();

    const hasMedia = activeRoom.media_id && activeRoom.media_id !== "";

    return (
        <>
            {/* Viewport border */}
            <div className="fixed inset-0 z-[98] pointer-events-none watch-party-border"/>

            {/* Bottom-right badge */}
            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                className="fixed bottom-4 left-4 z-[100]"
            >
                <div className="flex items-center gap-3 bg-content2/90 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-primary/20">
                    <Icon icon="mdi:account-group" width="18" className="text-primary"/>
                    <span className="text-sm font-medium">
                        {activeRoom.name || "Watch Party"}
                    </span>
                    <AvatarGroup max={3} size="sm">
                        {activeRoom.participants.map(p => (
                            <Avatar
                                key={p.user_id}
                                src={p.thumb || undefined}
                                name={p.username}
                                size="sm"
                            />
                        ))}
                    </AvatarGroup>
                    {hasMedia && (
                        <Button
                            size="sm"
                            variant="flat"
                            color="primary"
                            onPress={() => navigate(`/player/${activeRoom.media_id}`)}
                            startContent={<Icon icon="mdi:play-circle" width="14"/>}
                        >
                            Watch
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="flat"
                        color="danger"
                        onPress={leaveParty}
                        startContent={<Icon icon="mdi:exit-run" width="14"/>}
                    >
                        Leave
                    </Button>
                </div>
            </motion.div>
        </>
    );
}
