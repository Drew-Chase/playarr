import {Button} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {motion, AnimatePresence} from "framer-motion";

interface WatchQueuePanelProps {
    isOpen: boolean;
    onClose: () => void;
    queue: string[];
    isHost: boolean;
    onRemoveItem?: (index: number) => void;
    onPlayNext?: () => void;
}

export default function WatchQueuePanel({
    isOpen,
    onClose,
    queue,
    isHost,
    onRemoveItem,
    onPlayNext,
}: WatchQueuePanelProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{x: "100%"}}
                    animate={{x: 0}}
                    exit={{x: "100%"}}
                    transition={{type: "spring", damping: 25, stiffness: 300}}
                    className="fixed top-0 right-0 h-screen w-80 bg-content1/95 backdrop-blur-md z-50 flex flex-col shadow-2xl"
                >
                    <div className="flex items-center justify-between p-4 border-b border-divider">
                        <h3 className="font-semibold">Up Next</h3>
                        <Button isIconOnly variant="light" size="sm" onPress={onClose}>
                            <Icon icon="mdi:close" width="20"/>
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {queue.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-8 text-foreground/50">
                                <Icon icon="mdi:playlist-play" width="36"/>
                                <p className="text-sm">Queue is empty</p>
                            </div>
                        ) : (
                            queue.map((mediaId, index) => (
                                <div
                                    key={`${mediaId}-${index}`}
                                    className="flex items-center gap-3 p-2 rounded-lg bg-content2"
                                >
                                    <div className="w-6 h-6 flex items-center justify-center text-foreground/50 text-sm">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm truncate">{mediaId}</p>
                                    </div>
                                    {isHost && onRemoveItem && (
                                        <Button
                                            isIconOnly
                                            variant="light"
                                            size="sm"
                                            onPress={() => onRemoveItem(index)}
                                            className="text-danger"
                                        >
                                            <Icon icon="mdi:close" width="16"/>
                                        </Button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {isHost && queue.length > 0 && onPlayNext && (
                        <div className="p-4 border-t border-divider">
                            <Button
                                color="primary"
                                className="w-full"
                                onPress={onPlayNext}
                                startContent={<Icon icon="mdi:skip-next" width="20"/>}
                            >
                                Play Next
                            </Button>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
