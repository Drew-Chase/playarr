import {Link, useLocation} from "react-router-dom";
import {Icon} from "@iconify-icon/react";
import {useLibraries} from "../../hooks/usePlex";
import {Spinner} from "@heroui/react";

export default function Sidebar() {
    const location = useLocation();
    const {data: libraries, isLoading} = useLibraries();

    const navItems = [
        {path: "/", label: "Home", icon: "mdi:home"},
        {path: "/discover", label: "Discover", icon: "mdi:compass"},
        {path: "/downloads", label: "Downloads", icon: "mdi:download"},
        {path: "/settings", label: "Settings", icon: "mdi:cog"},
    ];

    const isActive = (path: string) => location.pathname === path;

    return (
        <aside className="hidden md:flex flex-col w-56 bg-content1 border-r border-divider overflow-y-auto shrink-0">
            <nav className="flex flex-col gap-1 p-3">
                {navItems.map(({path, label, icon}) => (
                    <Link
                        key={path}
                        to={path}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive(path)
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-default-100 text-foreground"
                        }`}
                    >
                        <Icon icon={icon} width="20" height="20"/>
                        {label}
                    </Link>
                ))}
            </nav>

            <div className="border-t border-divider mt-2 pt-2 px-3">
                <p className="text-xs text-default-400 uppercase font-semibold px-3 mb-2">Libraries</p>
                {isLoading && (
                    <div className="flex justify-center py-4">
                        <Spinner size="sm"/>
                    </div>
                )}
                <nav className="flex flex-col gap-1">
                    {libraries?.map((lib) => {
                        const libIcon = lib.type === "movie" ? "mdi:movie" :
                            lib.type === "show" ? "mdi:television" :
                                lib.type === "artist" ? "mdi:music" : "mdi:folder";
                        return (
                            <Link
                                key={lib.key}
                                to={`/library/${lib.key}`}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                    location.pathname === `/library/${lib.key}`
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-default-100 text-foreground"
                                }`}
                            >
                                <Icon icon={libIcon} width="18" height="18"/>
                                {lib.title}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}
