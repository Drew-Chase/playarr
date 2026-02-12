import {Button, Chip} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useState} from "react";
import {api} from "../../lib/api";
import type {ConnectionTestResult} from "../../lib/types";

interface ConnectionTestProps {
    service: string;
}

export default function ConnectionTest({service}: ConnectionTestProps) {
    const [testing, setTesting] = useState(false);
    const [result, setResult] = useState<ConnectionTestResult | null>(null);

    const handleTest = async () => {
        setTesting(true);
        setResult(null);
        try {
            const res = await api.post<ConnectionTestResult>(`/settings/test/${service}`);
            setResult(res);
        } catch {
            setResult({success: false, message: "Request failed"});
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="bordered"
                onPress={handleTest}
                isLoading={testing}
                startContent={!testing ? <Icon icon="mdi:connection" width="18"/> : undefined}
            >
                Test
            </Button>
            {result && (
                <Chip
                    color={result.success ? "success" : "danger"}
                    variant="flat"
                    size="sm"
                    startContent={<Icon icon={result.success ? "mdi:check" : "mdi:close"} width="14"/>}
                >
                    {result.message}
                </Chip>
            )}
        </div>
    );
}
