import {createContext, ReactNode, useCallback, useContext, useEffect, useState} from "react";
import {plexApi} from "../lib/plex.ts";
import type {PlexUser, SetupData} from "../lib/types.ts";

interface AuthContextType {
    user: PlexUser | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isGuest: boolean;
    isLoading: boolean;
    setupComplete: boolean | null;
    login: () => Promise<{ code: string; id: number }>;
    pollLogin: (id: number) => Promise<boolean>;
    guestLogin: () => Promise<void>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
    completeSetup: (data: SetupData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children}: { children: ReactNode }) {
    const [user, setUser] = useState<PlexUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [setupComplete, setSetupComplete] = useState<boolean | null>(null);

    const refresh = useCallback(async () => {
        try {
            const userData = await plexApi.getUser();
            setUser(userData);
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            try {
                const status = await plexApi.getStatus();
                setSetupComplete(status.setup_complete);
                if (status.setup_complete) {
                    await refresh();
                } else {
                    setIsLoading(false);
                }
            } catch {
                setSetupComplete(false);
                setIsLoading(false);
            }
        };
        init();
    }, [refresh]);

    const login = async () => {
        const pin = await plexApi.requestPin();
        return {code: pin.code, id: pin.id};
    };

    const pollLogin = async (id: number): Promise<boolean> => {
        const result = await plexApi.pollPin(id);
        if (result.claimed) {
            await refresh();
            return true;
        }
        return false;
    };

    const guestLogin = async () => {
        await plexApi.guestLogin();
        await refresh();
    };

    const logout = async () => {
        await plexApi.logout();
        setUser(null);
    };

    const completeSetup = async (data: SetupData) => {
        await plexApi.completeSetup(data);
        setSetupComplete(true);
        await refresh();
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isAdmin: !!user?.isAdmin,
                isGuest: !!user?.isGuest,
                isLoading,
                setupComplete,
                login,
                pollLogin,
                guestLogin,
                logout,
                refresh,
                completeSetup,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
