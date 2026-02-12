import {Outlet} from "react-router-dom";
import Navigation from "../Navigation.tsx";

export default function AppLayout() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navigation/>
            <main className="flex-1 pt-16">
                <Outlet/>
            </main>
        </div>
    );
}
