import {useState, useRef} from "react";
import {Button, Card, CardBody, Input, Spinner, Select, SelectItem, Switch} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useAuth} from "../providers/AuthProvider.tsx";
import {toast} from "sonner";
import {api} from "../lib/api.ts";
import type {ConnectionTestResult, DownloadClientConfig} from "../lib/types.ts";

const TOTAL_STEPS = 5;

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

function needsCredentials(type: string) {
    return type === "nzbget" || type === "transmission";
}

interface TestState {
    testing: boolean;
    result: ConnectionTestResult | null;
}

function SetupTestButton({service, params}: {
    service: string;
    params: Record<string, string>;
}) {
    const [state, setState] = useState<TestState>({testing: false, result: null});

    const handleTest = async () => {
        setState({testing: true, result: null});
        try {
            const res = await api.post<ConnectionTestResult>(`/setup/test/${service}`, params);
            setState({testing: false, result: res});
        } catch {
            setState({testing: false, result: {success: false, message: "Request failed"}});
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="bordered"
                size="sm"
                onPress={handleTest}
                isLoading={state.testing}
                startContent={!state.testing ? <Icon icon="mdi:connection" width="16"/> : undefined}
            >
                Test
            </Button>
            {state.result && (
                <span className={`text-xs ${state.result.success ? "text-success" : "text-danger"}`}>
                    {state.result.message}
                </span>
            )}
        </div>
    );
}

export default function Setup() {
    const {login, pollLogin, completeSetup, isAuthenticated} = useAuth();
    const [step, setStep] = useState(1);
    const [plexUrl, setPlexUrl] = useState("");
    const [pinCode, setPinCode] = useState("");
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isFinishing, setIsFinishing] = useState(false);
    const [plexAuthenticated, setPlexAuthenticated] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval>>();

    // Sonarr state
    const [sonarrUrl, setSonarrUrl] = useState("");
    const [sonarrApiKey, setSonarrApiKey] = useState("");

    // Radarr state
    const [radarrUrl, setRadarrUrl] = useState("");
    const [radarrApiKey, setRadarrApiKey] = useState("");

    // Download clients state
    const [clients, setClients] = useState<DownloadClientConfig[]>([]);

    // Download client test states
    const [clientTests, setClientTests] = useState<Record<number, TestState>>({});

    const handleNext = () => {
        if (step === 1 && !plexUrl.trim()) {
            toast.error("Please enter a Plex server URL");
            return;
        }
        setStep(step + 1);
    };

    const handleBack = () => {
        setStep(step - 1);
    };

    const handleSkip = () => {
        setStep(step + 1);
    };

    const handlePlexAuth = async () => {
        setIsAuthenticating(true);
        try {
            const {code, id} = await login();
            setPinCode(code);

            intervalRef.current = setInterval(async () => {
                try {
                    const claimed = await pollLogin(id);
                    if (claimed) {
                        clearInterval(intervalRef.current);
                        setPinCode("");
                        setIsAuthenticating(false);
                        setPlexAuthenticated(true);
                        setStep(3);
                    }
                } catch {
                    // continue polling
                }
            }, 2000);

            setTimeout(() => {
                clearInterval(intervalRef.current);
                if (pinCode || isAuthenticating) {
                    setPinCode("");
                    setIsAuthenticating(false);
                    toast.error("Authentication timed out");
                }
            }, 300000);
        } catch {
            setIsAuthenticating(false);
            toast.error("Failed to start authentication");
        }
    };

    const handleFinish = async () => {
        setIsFinishing(true);
        try {
            const setupData: Parameters<typeof completeSetup>[0] = {
                plex_url: plexUrl.trim(),
            };

            if (sonarrUrl.trim() && sonarrApiKey.trim()) {
                setupData.sonarr = {url: sonarrUrl.trim(), api_key: sonarrApiKey.trim()};
            }

            if (radarrUrl.trim() && radarrApiKey.trim()) {
                setupData.radarr = {url: radarrUrl.trim(), api_key: radarrApiKey.trim()};
            }

            const validClients = clients.filter(c => c.name.trim() && c.url.trim());
            if (validClients.length > 0) {
                setupData.download_clients = validClients;
            }

            await completeSetup(setupData);
        } catch {
            toast.error("Failed to complete setup");
            setIsFinishing(false);
        }
    };

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

    const testClient = async (index: number) => {
        const client = clients[index];
        setClientTests(prev => ({...prev, [index]: {testing: true, result: null}}));
        try {
            const res = await api.post<ConnectionTestResult>("/setup/test/download-client", {
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

    if (isFinishing || (isAuthenticated && plexAuthenticated && step > TOTAL_STEPS)) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Spinner size="lg" label="Setting up..."/>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-lg">
                <CardBody className="flex flex-col items-center gap-6 p-8">
                    <Icon icon="mdi:play-circle" width="48" className="text-primary"/>
                    <h1 className="text-2xl font-bold">Welcome to Playarr</h1>

                    {/* Step indicator */}
                    <div className="flex gap-1.5">
                        {Array.from({length: TOTAL_STEPS}, (_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all ${
                                    i + 1 === step
                                        ? "w-6 bg-primary"
                                        : i + 1 < step
                                            ? "w-3 bg-primary/40"
                                            : "w-3 bg-default-200"
                                }`}
                            />
                        ))}
                    </div>

                    {/* Step 1: Plex URL */}
                    {step === 1 && (
                        <>
                            <p className="text-foreground/60 text-center">
                                Let's get started. Enter your Plex server URL.
                            </p>
                            <Input
                                label="Plex Server URL"
                                value={plexUrl}
                                onValueChange={setPlexUrl}
                                placeholder="http://192.168.1.100:32400"
                                className="w-full"
                            />
                            <Button color="primary" size="lg" onPress={handleNext} className="w-full">
                                Next
                            </Button>
                        </>
                    )}

                    {/* Step 2: Plex Auth */}
                    {step === 2 && (
                        <>
                            <p className="text-foreground/60 text-center">
                                Sign in with your Plex account to continue.
                            </p>
                            {pinCode ? (
                                <div className="text-center space-y-3">
                                    <p className="text-sm">
                                        Go to{" "}
                                        <a href="https://plex.tv/link" target="_blank" rel="noopener noreferrer"
                                           className="text-primary underline">
                                            plex.tv/link
                                        </a>{" "}
                                        and enter:
                                    </p>
                                    <p className="text-4xl font-mono font-bold tracking-widest">
                                        {pinCode}
                                    </p>
                                    <Spinner size="sm"/>
                                </div>
                            ) : (
                                <>
                                    <Button
                                        color="primary"
                                        size="lg"
                                        onPress={handlePlexAuth}
                                        isLoading={isAuthenticating}
                                        className="w-full"
                                    >
                                        Sign in with Plex
                                    </Button>
                                    <Button
                                        variant="light"
                                        size="sm"
                                        onPress={handleBack}
                                    >
                                        Back
                                    </Button>
                                </>
                            )}
                        </>
                    )}

                    {/* Step 3: Sonarr */}
                    {step === 3 && (
                        <>
                            <p className="text-foreground/60 text-center text-sm">
                                Connect Sonarr for TV show management. You can skip this and configure it later.
                            </p>
                            <div className="w-full space-y-3">
                                <Input
                                    label="Sonarr URL"
                                    value={sonarrUrl}
                                    onValueChange={setSonarrUrl}
                                    placeholder="http://localhost:8989"
                                    autoComplete="one-time-code"
                                />
                                <Input
                                    label="API Key"
                                    value={sonarrApiKey}
                                    onValueChange={setSonarrApiKey}
                                    placeholder="Enter Sonarr API key"
                                    autoComplete="one-time-code"
                                />
                                {sonarrUrl && sonarrApiKey && (
                                    <SetupTestButton
                                        service="sonarr"
                                        params={{url: sonarrUrl, api_key: sonarrApiKey}}
                                    />
                                )}
                            </div>
                            <div className="flex gap-2 w-full">
                                <Button variant="bordered" onPress={handleSkip} className="flex-1">
                                    Skip
                                </Button>
                                <Button color="primary" onPress={handleNext} className="flex-1">
                                    Next
                                </Button>
                            </div>
                        </>
                    )}

                    {/* Step 4: Radarr */}
                    {step === 4 && (
                        <>
                            <p className="text-foreground/60 text-center text-sm">
                                Connect Radarr for movie management. You can skip this and configure it later.
                            </p>
                            <div className="w-full space-y-3">
                                <Input
                                    label="Radarr URL"
                                    value={radarrUrl}
                                    onValueChange={setRadarrUrl}
                                    placeholder="http://localhost:7878"
                                    autoComplete="one-time-code"
                                />
                                <Input
                                    label="API Key"
                                    value={radarrApiKey}
                                    onValueChange={setRadarrApiKey}
                                    placeholder="Enter Radarr API key"
                                    autoComplete="one-time-code"
                                />
                                {radarrUrl && radarrApiKey && (
                                    <SetupTestButton
                                        service="radarr"
                                        params={{url: radarrUrl, api_key: radarrApiKey}}
                                    />
                                )}
                            </div>
                            <div className="flex gap-2 w-full">
                                <Button variant="bordered" onPress={handleSkip} className="flex-1">
                                    Skip
                                </Button>
                                <Button color="primary" onPress={handleNext} className="flex-1">
                                    Next
                                </Button>
                            </div>
                        </>
                    )}

                    {/* Step 5: Download Clients */}
                    {step === 5 && (
                        <>
                            <p className="text-foreground/60 text-center text-sm">
                                Add download clients to monitor downloads. You can skip this and configure it later.
                            </p>
                            <div className="w-full space-y-3 max-h-[400px] overflow-y-auto">
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
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input
                                                    label="Name"
                                                    size="sm"
                                                    value={client.name}
                                                    onValueChange={(v) => updateClient(index, "name", v)}
                                                    placeholder="My SABnzbd"
                                                    autoComplete="one-time-code"
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
                                                    className="col-span-2"
                                                    autoComplete="one-time-code"
                                                />
                                                <Input
                                                    label="API Key"
                                                    size="sm"
                                                    value={client.api_key}
                                                    onValueChange={(v) => updateClient(index, "api_key", v)}
                                                    className={needsCredentials(client.type) ? "" : "col-span-2"}
                                                    autoComplete="one-time-code"
                                                />
                                                {needsCredentials(client.type) && (
                                                    <>
                                                        <Input
                                                            label="Username"
                                                            size="sm"
                                                            value={client.username}
                                                            onValueChange={(v) => updateClient(index, "username", v)}
                                                            autoComplete="one-time-code"
                                                        />
                                                        <Input
                                                            label="Password"
                                                            size="sm"
                                                            type="password"
                                                            value={client.password}
                                                            onValueChange={(v) => updateClient(index, "password", v)}
                                                            autoComplete="one-time-code"
                                                        />
                                                    </>
                                                )}
                                            </div>
                                            {client.url && (
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="bordered"
                                                        size="sm"
                                                        onPress={() => testClient(index)}
                                                        isLoading={clientTests[index]?.testing}
                                                        startContent={
                                                            !clientTests[index]?.testing
                                                                ? <Icon icon="mdi:connection" width="16"/>
                                                                : undefined
                                                        }
                                                    >
                                                        Test
                                                    </Button>
                                                    {clientTests[index]?.result && (
                                                        <span
                                                            className={`text-xs ${clientTests[index].result!.success ? "text-success" : "text-danger"}`}>
                                                            {clientTests[index].result!.message}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </CardBody>
                                    </Card>
                                ))}
                                <Button
                                    variant="bordered"
                                    size="sm"
                                    onPress={addClient}
                                    startContent={<Icon icon="mdi:plus" width="18"/>}
                                    className="w-full"
                                >
                                    Add Client
                                </Button>
                            </div>
                            <div className="flex gap-2 w-full">
                                {clients.length === 0 ? (
                                    <Button variant="bordered" onPress={handleFinish} className="flex-1"
                                            isLoading={isFinishing}>
                                        Skip
                                    </Button>
                                ) : null}
                                <Button color="primary" onPress={handleFinish} className="flex-1"
                                        isLoading={isFinishing}>
                                    Finish Setup
                                </Button>
                            </div>
                        </>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}
