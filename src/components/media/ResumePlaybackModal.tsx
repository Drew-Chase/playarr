import {Modal, ModalContent, ModalHeader, ModalBody, Listbox, ListboxItem} from "@heroui/react";
import {useNavigate} from "react-router-dom";

interface ResumePlaybackModalProps
{
    isOpen: boolean;
    onClose: () => void;
    ratingKey: string;
    viewOffset: number;
    duration: number;
}

function formatTime(ms: number): string
{
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0)
    {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function ResumePlaybackModal({isOpen, onClose, ratingKey, viewOffset, duration}: ResumePlaybackModalProps)
{
    const navigate = useNavigate();

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" backdrop="blur">
            <ModalContent>
                <ModalHeader className={"bg-[#1a1a1c] h-14 text-white"}>Resume Playback</ModalHeader>
                <ModalBody className="pb-6 gap-1 px-0">
                    <Listbox itemClasses={{base: "w-full p-4"}}>
                        <ListboxItem key={"resume"} classNames={{base: "bg-[#1a1a1c]/50 p-4"}} onPress={() => navigate(`/player/${ratingKey}`)}>Resume from {formatTime(viewOffset)} &mdash; {Math.round((duration - viewOffset) / 60000)}min left</ListboxItem>
                        <ListboxItem key={"start"} onPress={() => navigate(`/player/${ratingKey}?t=0`)}>Start from the beginning</ListboxItem>
                    </Listbox>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
