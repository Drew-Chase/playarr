import {Button, Input} from "@heroui/react";
import {useState} from "react";
import {toast} from "sonner";
import {api} from "../../lib/api.ts";
import ConnectionTest from "./ConnectionTest.tsx";

interface PlexSettingsProps {
    current?: { url: string; has_token: boolean };
    onSaved: () => void;
}

export default function PlexSettings({current, onSaved}: PlexSettingsProps) {
    const [url, setUrl] = useState(current?.url || "");
    const [token, setToken] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put("/settings/plex", {url, token: token || undefined});
            toast.success("Plex settings saved");
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
                label="Plex Server URL"
                value={url}
                onValueChange={setUrl}
                placeholder="http://192.168.1.100:32400"
                autoComplete={"one-time-code"}
            />
            <Input
                label="Server Admin Token"
                value={token}
                onValueChange={setToken}
                placeholder={current?.has_token ? "••••••••" : "Enter Plex admin token"}
                description="Required for library access. Found in Plex server XML settings."
                autoComplete={"one-time-code"}
            />
            <div className="flex gap-2">
                <Button color="primary" onPress={handleSave} isLoading={saving}>Save</Button>
                <ConnectionTest service="plex" params={{url, token}}/>
            </div>
        </div>
    );
}
