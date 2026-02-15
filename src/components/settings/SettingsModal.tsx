import {Modal, ModalContent, ModalHeader, ModalBody, Tabs, Tab, Spinner, Button, Input} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import {api} from "../../lib/api.ts";
import type {RedactedSettings} from "../../lib/types.ts";
import PlexSettings from "./PlexSettings.tsx";
import SonarrSettings from "./SonarrSettings.tsx";
import RadarrSettings from "./RadarrSettings.tsx";
import DownloadClientSettings from "./DownloadClientSettings.tsx";
import ConnectionTest from "./ConnectionTest.tsx";
import {useState} from "react";
import {toast} from "sonner";

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
                            <Tab key="tmdb" title="TMDB">
                                <TmdbSettings current={settings?.tmdb} onSaved={refetch}/>
                            </Tab>
                            <Tab key="downloads" title="Downloads">
                                <DownloadClientSettings onSaved={refetch}/>
                            </Tab>
                        </Tabs>
                    )}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}

function TmdbSettings({current, onSaved}: { current?: { has_api_key: boolean }; onSaved: () => void }) {
    const [apiKey, setApiKey] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put("/settings/tmdb", {api_key: apiKey});
            toast.success("TMDB settings saved");
            onSaved();
        } catch (err) {
            toast.error(`Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-lg space-y-4">
            <Input
                label="API Key"
                value={apiKey}
                onValueChange={setApiKey}
                placeholder={current?.has_api_key ? "••••••••" : "Enter TMDB API key"}
                autoComplete={"one-time-code"}
            />
            <div className="flex gap-2">
                <Button color="primary" onPress={handleSave} isLoading={saving}>
                    Save
                </Button>
                <ConnectionTest service="tmdb" params={{api_key: apiKey}}/>
            </div>
        </div>
    );
}
