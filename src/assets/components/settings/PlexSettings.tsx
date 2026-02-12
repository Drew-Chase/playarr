import {Button, Input} from "@heroui/react";
import {useState} from "react";
import {toast} from "sonner";
import {api} from "../../lib/api";
import {useAuth} from "../../providers/AuthProvider";
import ConnectionTest from "./ConnectionTest";

interface PlexSettingsProps {
    current?: { url: string; has_token: boolean };
    onSaved: () => void;
}

export default function PlexSettings({current, onSaved}: PlexSettingsProps) {
    const [url, setUrl] = useState(current?.url || "");
    const [token, setToken] = useState("");
    const [saving, setSaving] = useState(false);
    const {user, login, pollLogin, logout} = useAuth();
    const [pinCode, setPinCode] = useState("");
    const [isAuthenticating, setIsAuthenticating] = useState(false);

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

    const handlePlexAuth = async () => {
        setIsAuthenticating(true);
        try {
            const {code, id} = await login();
            setPinCode(code);

            // Poll for auth
            const interval = setInterval(async () => {
                const claimed = await pollLogin(id);
                if (claimed) {
                    clearInterval(interval);
                    setPinCode("");
                    setIsAuthenticating(false);
                    toast.success("Plex authentication successful!");
                    onSaved();
                }
            }, 2000);

            // Timeout after 5 minutes
            setTimeout(() => {
                clearInterval(interval);
                if (isAuthenticating) {
                    setPinCode("");
                    setIsAuthenticating(false);
                    toast.error("Authentication timed out");
                }
            }, 300000);
        } catch (err) {
            setIsAuthenticating(false);
            toast.error(`Auth failed: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
    };

    return (
        <div className="max-w-lg space-y-4">
            <Input
                label="Plex Server URL"
                value={url}
                onValueChange={setUrl}
                placeholder="http://192.168.1.100:32400"
            />
            <Input
                label="Token (optional - use PIN auth instead)"
                type="password"
                value={token}
                onValueChange={setToken}
                placeholder={current?.has_token ? "••••••••" : "Enter token or use PIN auth below"}
            />

            <div className="flex gap-2">
                <Button color="primary" onPress={handleSave} isLoading={saving}>Save</Button>
                <ConnectionTest service="plex"/>
            </div>

            <div className="border-t border-divider pt-4 mt-4">
                <h3 className="text-sm font-semibold mb-2">Plex PIN Authentication</h3>
                {user ? (
                    <div className="flex items-center gap-3">
                        {user.thumb && (
                            <img src={user.thumb} alt={user.title} className="w-8 h-8 rounded-full"/>
                        )}
                        <span className="text-sm">Signed in as <strong>{user.title}</strong></span>
                        <Button size="sm" variant="flat" color="danger" onPress={logout}>
                            Sign Out
                        </Button>
                    </div>
                ) : pinCode ? (
                    <div className="text-center">
                        <p className="text-sm mb-2">Enter this code at <a href="https://plex.tv/link" target="_blank" rel="noopener" className="text-primary underline">plex.tv/link</a></p>
                        <p className="text-3xl font-mono font-bold tracking-widest">{pinCode}</p>
                    </div>
                ) : (
                    <Button
                        variant="bordered"
                        onPress={handlePlexAuth}
                        isLoading={isAuthenticating}
                    >
                        Sign in with Plex
                    </Button>
                )}
            </div>
        </div>
    );
}
