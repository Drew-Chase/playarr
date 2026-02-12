import React from "react";
import {Link, useNavigate} from "react-router-dom";
import {
    Navbar,
    NavbarBrand,
    NavbarContent,
    NavbarItem,
    NavbarMenu,
    NavbarMenuItem,
    NavbarMenuToggle,
    Input,
    Button,
    Badge,
} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {ThemeSwitchComponent} from "../providers/ThemeProvider.tsx";
import {useAuth} from "../providers/AuthProvider.tsx";
import {useDownloads} from "../hooks/useDownloads";

export default function Navigation() {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const navigate = useNavigate();
    const {user, isAuthenticated} = useAuth();
    const {data: downloads} = useDownloads();

    const activeDownloads = downloads?.queue_size || 0;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const pages = [
        {label: "Home", path: "/", icon: "mdi:home"},
        {label: "Discover", path: "/discover", icon: "mdi:compass"},
        {label: "Downloads", path: "/downloads", icon: "mdi:download"},
        {label: "Watch Party", path: "/watch-party", icon: "mdi:account-group"},
        {label: "Settings", path: "/settings", icon: "mdi:cog"},
    ];

    return (
        <Navbar onMenuOpenChange={setIsMenuOpen} maxWidth="full" className="border-b border-divider">
            <NavbarContent>
                <NavbarMenuToggle aria-label={isMenuOpen ? "Close menu" : "Open menu"} className="md:hidden"/>
                <NavbarBrand>
                    <Link to="/" className="flex items-center gap-2">
                        <Icon icon="mdi:play-circle" width="28" className="text-primary"/>
                        <p className="font-bold text-inherit text-lg">Playarr</p>
                    </Link>
                </NavbarBrand>
            </NavbarContent>

            <NavbarContent className="hidden md:flex" justify="center">
                <form onSubmit={handleSearch} className="w-80">
                    <Input
                        size="sm"
                        placeholder="Search..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                        startContent={<Icon icon="mdi:magnify" width="18"/>}
                        isClearable
                        onClear={() => setSearchQuery("")}
                    />
                </form>
            </NavbarContent>

            <NavbarContent justify="end">
                <NavbarItem>
                    {activeDownloads > 0 ? (
                        <Badge content={activeDownloads} color="primary" size="sm">
                            <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                onPress={() => navigate("/downloads")}
                            >
                                <Icon icon="mdi:download" width="20"/>
                            </Button>
                        </Badge>
                    ) : (
                        <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            onPress={() => navigate("/downloads")}
                        >
                            <Icon icon="mdi:download" width="20"/>
                        </Button>
                    )}
                </NavbarItem>
                <NavbarItem>
                    <ThemeSwitchComponent/>
                </NavbarItem>
                {isAuthenticated && user && (
                    <NavbarItem>
                        {user.thumb ? (
                            <img src={user.thumb} alt={user.title} className="w-8 h-8 rounded-full"/>
                        ) : (
                            <Icon icon="mdi:account-circle" width="28"/>
                        )}
                    </NavbarItem>
                )}
            </NavbarContent>

            <NavbarMenu>
                {pages.map(({label, path, icon}) => (
                    <NavbarMenuItem key={path}>
                        <Link
                            to={path}
                            className="flex items-center gap-3 w-full py-2 text-foreground"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <Icon icon={icon} width="20"/>
                            {label}
                        </Link>
                    </NavbarMenuItem>
                ))}
            </NavbarMenu>
        </Navbar>
    );
}
