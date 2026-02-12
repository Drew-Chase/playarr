import React from "react";
import {BrowserRouter, Route, Routes, useNavigate} from "react-router-dom";
import ReactDOM from "react-dom/client";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {Toaster} from "sonner";

import "./css/index.css";
import Home from "./pages/Home.tsx";
import Library from "./pages/Library.tsx";
import Detail from "./pages/Detail.tsx";
import Player from "./pages/Player.tsx";
import Search from "./pages/Search.tsx";
import Discover from "./pages/Discover.tsx";
import Downloads from "./pages/Downloads.tsx";
import WatchParty from "./pages/WatchParty.tsx";
import Settings from "./pages/Settings.tsx";
import AppLayout from "./components/layout/AppLayout.tsx";
import {ThemeProvider} from "./providers/ThemeProvider.tsx";
import {AuthProvider} from "./providers/AuthProvider.tsx";
import {PlayerProvider} from "./providers/PlayerProvider.tsx";
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
                <ThemeProvider>
                    <AuthProvider>
                        <PlayerProvider>
                            <MainContentRenderer/>
                        </PlayerProvider>
                    </AuthProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </BrowserRouter>
    </React.StrictMode>
);

export function MainContentRenderer() {
    const navigate = useNavigate();
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
                    <Route path="/downloads" element={<Downloads/>}/>
                    <Route path="/watch-party/:roomId?" element={<WatchParty/>}/>
                    <Route path="/settings" element={<Settings/>}/>
                </Route>
            </Routes>
        </HeroUIProvider>
    );
}
