import {Button, Input} from "@heroui/react";
import {useState} from "react";
import {toast} from "sonner";
import {api} from "../../lib/api.ts";
import ConnectionTest from "./ConnectionTest.tsx";

interface SonarrSettingsProps {
    current?: { url: string; has_api_key: boolean };
    onSaved: () => void;
}

export default function SonarrSettings({current, onSaved}: SonarrSettingsProps) {
    const [url, setUrl] = useState(current?.url || "");
    const [apiKey, setApiKey] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put("/settings/sonarr", {url, api_key: apiKey});
            toast.success("Sonarr settings saved");
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
                label="Sonarr URL"
                value={url}
                onValueChange={setUrl}
                placeholder="http://localhost:8989"
                autoComplete={"one-time-code"}
            />
            <Input
                label="API Key"
                value={apiKey}
                onValueChange={setApiKey}
                placeholder={current?.has_api_key ? "••••••••" : "Enter Sonarr API key"}
                autoComplete={"one-time-code"}
            />
            <div className="flex gap-2">
                <Button color="primary" onPress={handleSave} isLoading={saving}>Save</Button>
                <ConnectionTest service="sonarr" params={{url, api_key: apiKey}}/>
            </div>
        </div>
    );
}
