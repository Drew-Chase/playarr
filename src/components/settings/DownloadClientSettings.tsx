import {Button, Input, Select, SelectItem, Switch, Card, CardBody, Chip} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useState} from "react";
import {toast} from "sonner";
import {api} from "../../lib/api.ts";
import type {ConnectionTestResult, DownloadClientConfig} from "../../lib/types.ts";

interface RedactedDownloadClient {
    name: string;
    type: string;
    url: string;
    has_api_key: boolean;
    has_credentials: boolean;
    enabled: boolean;
}

interface DownloadClientSettingsProps {
    current?: RedactedDownloadClient[];
    onSaved: () => void;
}

const CLIENT_TYPES = [
    {key: "sabnzbd", label: "SABnzbd"},
    {key: "nzbget", label: "NZBGet"},
    {key: "qbittorrent", label: "qBittorrent"},
    {key: "transmission", label: "Transmission"},
];

function emptyClient(): DownloadClientConfig {
    return {
        name: "",
        type: "sabnzbd",
        url: "",
        api_key: "",
        username: "",
        password: "",
        enabled: true,
    };
}

interface TestState {
    testing: boolean;
    result: ConnectionTestResult | null;
}

export default function DownloadClientSettings({current, onSaved}: DownloadClientSettingsProps) {
    const [clients, setClients] = useState<DownloadClientConfig[]>(() =>
        (current ?? []).map(c => ({
            name: c.name,
            type: c.type as DownloadClientConfig["type"],
            url: c.url,
            api_key: "",
            username: "",
            password: "",
            enabled: c.enabled,
        }))
    );
    // Track which indices came from saved config (for placeholder hints)
    const [savedMeta] = useState<Record<number, RedactedDownloadClient>>(() => {
        const meta: Record<number, RedactedDownloadClient> = {};
        (current ?? []).forEach((c, i) => { meta[i] = c; });
        return meta;
    });
    const [saving, setSaving] = useState(false);
    const [clientTests, setClientTests] = useState<Record<number, TestState>>({});

    const addClient = () => {
        setClients([...clients, emptyClient()]);
    };

    const updateClient = (index: number, field: keyof DownloadClientConfig, value: string | boolean) => {
        const updated = [...clients];
        (updated[index] as any)[field] = value;
        setClients(updated);
    };

    const removeClient = (index: number) => {
        setClients(clients.filter((_, i) => i !== index));
        const newTests = {...clientTests};
        delete newTests[index];
        setClientTests(newTests);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put("/settings/download-clients", clients);
            toast.success("Download clients saved");
            onSaved();
        } catch (err) {
            toast.error(`Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            setSaving(false);
        }
    };

    const testClient = async (index: number) => {
        const client = clients[index];
        setClientTests(prev => ({...prev, [index]: {testing: true, result: null}}));
        try {
            const res = await api.post<ConnectionTestResult>("/settings/test/download-client", {
                url: client.url,
                type: client.type,
                api_key: client.api_key,
                username: client.username,
                password: client.password,
            });
            setClientTests(prev => ({...prev, [index]: {testing: false, result: res}}));
        } catch {
            setClientTests(prev => ({
                ...prev,
                [index]: {testing: false, result: {success: false, message: "Request failed"}},
            }));
        }
    };

    const needsCredentials = (type: string) => type === "nzbget" || type === "transmission";

    return (
        <div className="space-y-4">
            {clients.map((client, index) => (
                <Card key={index} className="bg-content2">
                    <CardBody className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Client #{index + 1}</h3>
                            <div className="flex items-center gap-2">
                                <Switch
                                    size="sm"
                                    isSelected={client.enabled}
                                    onValueChange={(v) => updateClient(index, "enabled", v)}
                                />
                                <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    color="danger"
                                    onPress={() => removeClient(index)}
                                >
                                    <Icon icon="mdi:delete" width="18"/>
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                                label="Name"
                                size="sm"
                                value={client.name}
                                onValueChange={(v) => updateClient(index, "name", v)}
                                placeholder="My SABnzbd"
                                autoComplete={"one-time-code"}
                            />
                            <Select
                                label="Type"
                                size="sm"
                                selectedKeys={[client.type]}
                                onChange={(e) => updateClient(index, "type", e.target.value)}
                            >
                                {CLIENT_TYPES.map((t) => (
                                    <SelectItem key={t.key}>{t.label}</SelectItem>
                                ))}
                            </Select>
                            <Input
                                label="URL"
                                size="sm"
                                value={client.url}
                                onValueChange={(v) => updateClient(index, "url", v)}
                                placeholder="http://localhost:8080"
                                className="md:col-span-2"
                                autoComplete={"one-time-code"}
                            />
                            <Input
                                label="API Key"
                                size="sm"
                                value={client.api_key}
                                onValueChange={(v) => updateClient(index, "api_key", v)}
                                placeholder={savedMeta[index]?.has_api_key ? "••••••••" : "Enter API key"}
                                autoComplete={"one-time-code"}
                            />
                            {needsCredentials(client.type) && (
                                <>
                                    <Input
                                        label="Username"
                                        size="sm"
                                        value={client.username}
                                        onValueChange={(v) => updateClient(index, "username", v)}
                                        placeholder={savedMeta[index]?.has_credentials ? "••••••••" : "Enter username"}
                                        autoComplete={"one-time-code"}
                                    />
                                    <Input
                                        label="Password"
                                        size="sm"
                                        type="password"
                                        value={client.password}
                                        onValueChange={(v) => updateClient(index, "password", v)}
                                        placeholder={savedMeta[index]?.has_credentials ? "••••••••" : "Enter password"}
                                        autoComplete={"one-time-code"}
                                    />
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="bordered"
                                size="sm"
                                onPress={() => testClient(index)}
                                isLoading={clientTests[index]?.testing}
                                isDisabled={!client.url}
                                startContent={
                                    !clientTests[index]?.testing
                                        ? <Icon icon="mdi:connection" width="16"/>
                                        : undefined
                                }
                            >
                                Test
                            </Button>
                            {clientTests[index]?.result && (
                                <Chip
                                    color={clientTests[index].result!.success ? "success" : "danger"}
                                    variant="flat"
                                    size="sm"
                                    startContent={
                                        <Icon
                                            icon={clientTests[index].result!.success ? "mdi:check" : "mdi:close"}
                                            width="14"
                                        />
                                    }
                                >
                                    {clientTests[index].result!.message}
                                </Chip>
                            )}
                        </div>
                    </CardBody>
                </Card>
            ))}

            <div className="flex gap-2">
                <Button
                    variant="bordered"
                    onPress={addClient}
                    startContent={<Icon icon="mdi:plus" width="18"/>}
                >
                    Add Client
                </Button>
                {clients.length > 0 && (
                    <Button color="primary" onPress={handleSave} isLoading={saving}>
                        Save All
                    </Button>
                )}
            </div>
        </div>
    );
}
