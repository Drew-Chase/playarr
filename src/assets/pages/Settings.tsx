import {Tabs, Tab, Spinner} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import {api} from "../lib/api";
import type {RedactedSettings} from "../lib/types";
import PlexSettings from "../components/settings/PlexSettings";
import SonarrSettings from "../components/settings/SonarrSettings";
import RadarrSettings from "../components/settings/RadarrSettings";
import DownloadClientSettings from "../components/settings/DownloadClientSettings";

export default function Settings() {
    const {data: settings, isLoading, refetch} = useQuery({
        queryKey: ["settings"],
        queryFn: () => api.get<RedactedSettings>("/settings"),
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg"/>
            </div>
        );
    }

    return (
        <div className="px-6 md:px-12 lg:px-16 py-6">
            <h1 className="text-2xl font-bold mb-6">Settings</h1>
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
        </div>
    );
}

// Inline TMDB settings since it's simple
import {Button, Input} from "@heroui/react";
import {useState} from "react";
import {toast} from "sonner";
import ConnectionTest from "../components/settings/ConnectionTest";

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
                type="password"
                value={apiKey}
                onValueChange={setApiKey}
                placeholder={current?.has_api_key ? "••••••••" : "Enter TMDB API key"}
            />
            <div className="flex gap-2">
                <Button color="primary" onPress={handleSave} isLoading={saving}>
                    Save
                </Button>
                <ConnectionTest service="tmdb"/>
            </div>
        </div>
    );
}
