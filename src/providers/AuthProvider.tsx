import {createContext, ReactNode, useCallback, useContext, useEffect, useState} from "react";
import {plexApi} from "../lib/plex.ts";
import type {PlexUser} from "../lib/types.ts";

interface AuthContextType {
    user: PlexUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: () => Promise<{ code: string; id: number }>;
    pollLogin: (id: number) => Promise<boolean>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children}: { children: ReactNode }) {
    const [user, setUser] = useState<PlexUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
        refresh();
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

    const logout = async () => {
        await plexApi.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                pollLogin,
                logout,
                refresh,
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
