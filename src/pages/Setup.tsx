import {useState, useRef} from "react";
import {Button, Card, CardBody, Input, Spinner} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useAuth} from "../providers/AuthProvider.tsx";
import {toast} from "sonner";

export default function Setup() {
    const {login, pollLogin, completeSetup, isAuthenticated} = useAuth();
    const [step, setStep] = useState(1);
    const [plexUrl, setPlexUrl] = useState("");
    const [pinCode, setPinCode] = useState("");
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isFinishing, setIsFinishing] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval>>();

    const handleNext = () => {
        if (!plexUrl.trim()) {
            toast.error("Please enter a Plex server URL");
            return;
        }
        setStep(2);
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
                        // Complete setup with the URL
                        setIsFinishing(true);
                        try {
                            await completeSetup(plexUrl.trim());
                        } catch {
                            toast.error("Failed to complete setup");
                            setIsFinishing(false);
                        }
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

    if (isFinishing || isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Spinner size="lg" label="Setting up..."/>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-md">
                <CardBody className="flex flex-col items-center gap-6 p-8">
                    <Icon icon="mdi:play-circle" width="48" className="text-primary"/>
                    <h1 className="text-2xl font-bold">Welcome to Playarr</h1>

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

                    {step === 2 && (
                        <>
                            <p className="text-foreground/60 text-center">
                                Sign in with your Plex account to complete setup.
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
                                        onPress={() => setStep(1)}
                                    >
                                        Back
                                    </Button>
                                </>
                            )}
                        </>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}
