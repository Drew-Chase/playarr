import {Modal, ModalContent, ModalHeader, ModalBody, Tabs, Tab, Spinner} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import {api} from "../../lib/api.ts";
import type {RedactedSettings} from "../../lib/types.ts";
import PlexSettings from "./PlexSettings.tsx";
import SonarrSettings from "./SonarrSettings.tsx";
import RadarrSettings from "./RadarrSettings.tsx";
import DownloadClientSettings from "./DownloadClientSettings.tsx";
import OpenSubtitlesSettings from "./OpenSubtitlesSettings.tsx";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({isOpen, onClose}: SettingsModalProps) {
    const {data: settings, isLoading, refetch} = useQuery({
        queryKey: ["settings"],
        queryFn: () => api.get<RedactedSettings>("/settings"),
        enabled: isOpen,
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside" backdrop={"blur"}>
            <ModalContent>
                <ModalHeader>Settings</ModalHeader>
                <ModalBody className="pb-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Spinner size="lg"/>
                        </div>
                    ) : (
                        <Tabs aria-label="Settings sections" variant="underlined" classNames={{panel: "pt-4"}}>
                            <Tab key="plex" title="Plex">
                                <PlexSettings current={settings?.plex} onSaved={refetch}/>
                            </Tab>
                            <Tab key="sonarr" title="Sonarr">
                                <SonarrSettings current={settings?.sonarr} onSaved={refetch}/>
                            </Tab>
                            <Tab key="radarr" title="Radarr">
                                <RadarrSettings current={settings?.radarr} onSaved={refetch}/>
                            </Tab>
                            <Tab key="downloads" title="Downloads">
                                <DownloadClientSettings current={settings?.download_clients} onSaved={refetch}/>
                            </Tab>
                            <Tab key="opensubtitles" title="Subtitles">
                                <OpenSubtitlesSettings current={settings?.opensubtitles} onSaved={refetch}/>
                            </Tab>
                        </Tabs>
                    )}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
