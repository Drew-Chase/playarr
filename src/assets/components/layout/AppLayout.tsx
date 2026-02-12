import {Outlet} from "react-router-dom";
import Navigation from "../Navigation.tsx";
import Sidebar from "./Sidebar.tsx";

export default function AppLayout() {
    return (
        <div className="flex flex-col h-screen">
            <Navigation/>
            <div className="flex flex-1 overflow-hidden">
                <Sidebar/>
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <Outlet/>
                </main>
            </div>
        </div>
    );
}
