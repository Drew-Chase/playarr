import {useState} from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    RadioGroup,
    Radio,
    Snippet,
} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useWatchPartyContext} from "../../providers/WatchPartyProvider.tsx";
import type {WatchPartyAccessMode} from "../../lib/types.ts";
import UserPicker from "./UserPicker.tsx";

interface CreatePartyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreatePartyModal({isOpen, onClose}: CreatePartyModalProps) {
    const watchParty = useWatchPartyContext();
    const [name, setName] = useState("");
    const [accessMode, setAccessMode] = useState<WatchPartyAccessMode>("everyone");
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [inviteCode, setInviteCode] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!watchParty) return;
        setIsCreating(true);
        try {
            const room = await watchParty.createParty({
                name: name.trim() || undefined,
                accessMode,
                allowedUserIds: accessMode === "by_user" ? selectedUserIds : undefined,
            });
            if (room.invite_code) {
                setInviteCode(room.invite_code);
            } else {
                handleClose();
            }
        } catch {
            // error handled by api wrapper
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        setName("");
        setAccessMode("everyone");
        setSelectedUserIds([]);
        setInviteCode(null);
        setIsCreating(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="2xl" backdrop="blur">
            <ModalContent>
                {inviteCode ? (
                    <>
                        <ModalHeader>Watch Party Created</ModalHeader>
                        <ModalBody>
                            <p className="text-foreground/70 text-sm">
                                Share this invite code with friends to join your watch party:
                            </p>
                            <Snippet symbol="" className="text-lg font-mono">
                                {inviteCode}
                            </Snippet>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="primary" onPress={handleClose}>
                                Done
                            </Button>
                        </ModalFooter>
                    </>
                ) : (
                    <>
                        <ModalHeader className="flex items-center gap-2">
                            <Icon icon="mdi:plus-circle" width="24" className="text-primary"/>
                            Create Watch Party
                        </ModalHeader>
                        <ModalBody className="gap-4">
                            <Input
                                label="Party Name"
                                placeholder="Movie Night"
                                value={name}
                                onValueChange={setName}
                                description="Optional - defaults to your username's party"
                            />
                            <RadioGroup
                                label="Who can join?"
                                value={accessMode}
                                onValueChange={(v) => setAccessMode(v as WatchPartyAccessMode)}
                            >
                                <Radio value="everyone" description="Any user on this server can join">
                                    Everyone
                                </Radio>
                                <Radio value="invite_only" description="Share an invite code to let people join">
                                    Invite Only
                                </Radio>
                                <Radio value="by_user" description="Choose specific users from your server">
                                    Select Users
                                </Radio>
                            </RadioGroup>
                            {accessMode === "by_user" && (
                                <UserPicker
                                    selectedIds={selectedUserIds}
                                    onSelectionChange={setSelectedUserIds}
                                />
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="light" onPress={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                color="primary"
                                onPress={handleCreate}
                                isLoading={isCreating}
                                isDisabled={accessMode === "by_user" && selectedUserIds.length === 0}
                            >
                                Create Party
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
