import {useState} from "react";
import {Button, Input} from "@heroui/react";
import {toast} from "sonner";
import {api} from "../../lib/api.ts";
import ConnectionTest from "./ConnectionTest.tsx";

interface OpenSubtitlesSettingsProps {
    current?: { has_api_key: boolean };
    onSaved: () => void;
}

export default function OpenSubtitlesSettings({current, onSaved}: OpenSubtitlesSettingsProps) {
    const [apiKey, setApiKey] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put("/settings/opensubtitles", {api_key: apiKey});
            toast.success("OpenSubtitles settings saved");
            onSaved();
        } catch (err) {
            toast.error(`Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-lg space-y-4">
            <p className="text-sm text-foreground/60">
                Enter your OpenSubtitles.com API key to enable subtitle search. You can get one from your
                {" "}<a href="https://www.opensubtitles.com/en/consumers" target="_blank" rel="noopener noreferrer" className="text-primary underline">OpenSubtitles API Consumers</a> page.
            </p>
            <Input
                label="API Key"
                type="password"
                placeholder={current?.has_api_key ? "••••••••" : "Enter your API key"}
                value={apiKey}
                onValueChange={setApiKey}
                description={current?.has_api_key ? "A key is already saved. Enter a new one to replace it." : undefined}
            />
            <div className="flex gap-2">
                <Button color="primary" onPress={handleSave} isLoading={saving} isDisabled={!apiKey}>
                    Save
                </Button>
                <ConnectionTest service="opensubtitles" params={apiKey ? {api_key: apiKey} : {}}/>
            </div>
        </div>
    );
}
