import {Button, Input} from "@heroui/react";
import {useState} from "react";
import {toast} from "sonner";
import {api} from "../../lib/api";
import ConnectionTest from "./ConnectionTest";

interface RadarrSettingsProps {
    current?: { url: string; has_api_key: boolean };
    onSaved: () => void;
}

export default function RadarrSettings({current, onSaved}: RadarrSettingsProps) {
    const [url, setUrl] = useState(current?.url || "");
    const [apiKey, setApiKey] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put("/settings/radarr", {url, api_key: apiKey});
            toast.success("Radarr settings saved");
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
                label="Radarr URL"
                value={url}
                onValueChange={setUrl}
                placeholder="http://localhost:7878"
            />
            <Input
                label="API Key"
                type="password"
                value={apiKey}
                onValueChange={setApiKey}
                placeholder={current?.has_api_key ? "••••••••" : "Enter Radarr API key"}
            />
            <div className="flex gap-2">
                <Button color="primary" onPress={handleSave} isLoading={saving}>Save</Button>
                <ConnectionTest service="radarr"/>
            </div>
        </div>
    );
}
