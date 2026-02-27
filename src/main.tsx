import React from "react";
import {BrowserRouter, Route, Routes, useNavigate} from "react-router-dom";
import ReactDOM from "react-dom/client";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {Toaster} from "sonner";
import {Spinner} from "@heroui/react";

import "./css/index.css";
import Home from "./pages/Home.tsx";
import Library from "./pages/Library.tsx";
import Detail from "./pages/Detail.tsx";
import Player from "./pages/Player.tsx";
import Search from "./pages/Search.tsx";
import Discover from "./pages/Discover.tsx";
import DiscoverDetail from "./pages/DiscoverDetail.tsx";
import Calendar from "./pages/Calendar.tsx";
import Login from "./pages/Login.tsx";
import Setup from "./pages/Setup.tsx";
import AppLayout from "./components/layout/AppLayout.tsx";
import {AuthProvider, useAuth} from "./providers/AuthProvider.tsx";
import {PlayerProvider} from "./providers/PlayerProvider.tsx";
import WatchPartyProvider from "./providers/WatchPartyProvider.tsx";
import {HeroUIProvider} from "@heroui/react";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: 1,
        },
    },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                    <AuthProvider>
                        <PlayerProvider>
                            <WatchPartyProvider>
                                <MainContentRenderer/>
                            </WatchPartyProvider>
                        </PlayerProvider>
                    </AuthProvider>
            </QueryClientProvider>
        </BrowserRouter>
    </React.StrictMode>
);

export function MainContentRenderer() {
    const navigate = useNavigate();
    const {isAuthenticated, isLoading, setupComplete} = useAuth();

    // Still checking setup status or user session
    if (setupComplete === null || isLoading) {
        return (
            <HeroUIProvider navigate={navigate}>
                <div className="flex items-center justify-center min-h-screen">
                    <Spinner size="lg"/>
                </div>
            </HeroUIProvider>
        );
    }

    // Server not configured — show setup wizard
    if (!setupComplete) {
        return (
            <HeroUIProvider navigate={navigate}>
                <Toaster richColors position="bottom-right"/>
                <Setup/>
            </HeroUIProvider>
        );
    }

    // Not signed in — show login page
    if (!isAuthenticated) {
        return (
            <HeroUIProvider navigate={navigate}>
                <Toaster richColors position="bottom-right"/>
                <Login/>
            </HeroUIProvider>
        );
    }

    // Fully authenticated — show main app
    return (
        <HeroUIProvider navigate={navigate}>
            <Toaster richColors position="bottom-right"/>
            <Routes>
                <Route path="/player/:id" element={<Player/>}/>
                <Route element={<AppLayout/>}>
                    <Route path="/" element={<Home/>}/>
                    <Route path="/library/:key" element={<Library/>}/>
                    <Route path="/detail/:id" element={<Detail/>}/>
                    <Route path="/search" element={<Search/>}/>
                    <Route path="/discover" element={<Discover/>}/>
                    <Route path="/discover/:mediaType/:tmdbId" element={<DiscoverDetail/>}/>
                    <Route path="/calendar" element={<Calendar/>}/>
                </Route>
            </Routes>
        </HeroUIProvider>
    );
}
