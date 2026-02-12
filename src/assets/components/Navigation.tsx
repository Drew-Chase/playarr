import React from "react";
import {Link, useNavigate, useLocation} from "react-router-dom";
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
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {ThemeSwitchComponent} from "../providers/ThemeProvider.tsx";
import {useAuth} from "../providers/AuthProvider.tsx";
import {useLibraries} from "../hooks/usePlex";

export default function Navigation() {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [searchOpen, setSearchOpen] = React.useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const {user, isAuthenticated} = useAuth();
    const {data: libraries} = useLibraries();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearchOpen(false);
        }
    };

    const isActive = (path: string) => location.pathname === path;

    const movieLibraries = libraries?.filter(l => l.type === "movie") || [];
    const tvLibraries = libraries?.filter(l => l.type === "show") || [];

    const navLinks = [
        {label: "Home", path: "/"},
        {label: "Discover", path: "/discover"},
        {label: "Downloads", path: "/downloads"},
        {label: "Watch Party", path: "/watch-party"},
    ];

    return (
        <Navbar
            onMenuOpenChange={setIsMenuOpen}
            maxWidth="full"
            className="bg-background/80 backdrop-blur-md border-none fixed top-0 z-50"
            height="4rem"
        >
            <NavbarContent>
                <NavbarMenuToggle aria-label={isMenuOpen ? "Close menu" : "Open menu"} className="md:hidden"/>
                <NavbarBrand>
                    <Link to="/" className="flex items-center gap-2">
                        <Icon icon="mdi:play-circle" width="28" className="text-primary"/>
                        <p className="font-bold text-inherit text-lg">Playarr</p>
                    </Link>
                </NavbarBrand>
            </NavbarContent>

            <NavbarContent className="hidden md:flex gap-6" justify="center">
                {navLinks.map(({label, path}) => (
                    <NavbarItem key={path}>
                        <Link
                            to={path}
                            className={`text-sm font-medium transition-colors ${
                                isActive(path) ? "text-primary" : "text-foreground/70 hover:text-foreground"
                            }`}
                        >
                            {label}
                        </Link>
                    </NavbarItem>
                ))}

                {movieLibraries.length > 0 && (
                    <Dropdown>
                        <NavbarItem>
                            <DropdownTrigger>
                                <Button
                                    variant="light"
                                    size="sm"
                                    className={`text-sm font-medium p-0 min-w-0 ${
                                        location.pathname.startsWith("/library") ? "text-primary" : "text-foreground/70"
                                    }`}
                                    endContent={<Icon icon="mdi:chevron-down" width="16"/>}
                                >
                                    Movies
                                </Button>
                            </DropdownTrigger>
                        </NavbarItem>
                        <DropdownMenu aria-label="Movie Libraries">
                            {movieLibraries.map((lib) => (
                                <DropdownItem key={lib.key} onPress={() => navigate(`/library/${lib.key}`)}>
                                    {lib.title}
                                </DropdownItem>
                            ))}
                        </DropdownMenu>
                    </Dropdown>
                )}

                {tvLibraries.length > 0 && (
                    <Dropdown>
                        <NavbarItem>
                            <DropdownTrigger>
                                <Button
                                    variant="light"
                                    size="sm"
                                    className={`text-sm font-medium p-0 min-w-0 ${
                                        location.pathname.startsWith("/library") ? "text-primary" : "text-foreground/70"
                                    }`}
                                    endContent={<Icon icon="mdi:chevron-down" width="16"/>}
                                >
                                    TV Shows
                                </Button>
                            </DropdownTrigger>
                        </NavbarItem>
                        <DropdownMenu aria-label="TV Libraries">
                            {tvLibraries.map((lib) => (
                                <DropdownItem key={lib.key} onPress={() => navigate(`/library/${lib.key}`)}>
                                    {lib.title}
                                </DropdownItem>
                            ))}
                        </DropdownMenu>
                    </Dropdown>
                )}
            </NavbarContent>

            <NavbarContent justify="end">
                <NavbarItem>
                    {searchOpen ? (
                        <form onSubmit={handleSearch} className="flex items-center gap-1">
                            <Input
                                size="sm"
                                placeholder="Search..."
                                value={searchQuery}
                                onValueChange={setSearchQuery}
                                className="w-48"
                                autoFocus
                                isClearable
                                onClear={() => {
                                    setSearchQuery("");
                                    setSearchOpen(false);
                                }}
                            />
                        </form>
                    ) : (
                        <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            onPress={() => setSearchOpen(true)}
                        >
                            <Icon icon="mdi:magnify" width="20"/>
                        </Button>
                    )}
                </NavbarItem>
                <NavbarItem>
                    <ThemeSwitchComponent/>
                </NavbarItem>
                {isAuthenticated && user && (
                    <Dropdown>
                        <DropdownTrigger>
                            <Button isIconOnly variant="light" size="sm" className="rounded-full">
                                {user.thumb ? (
                                    <img src={user.thumb} alt={user.title} className="w-8 h-8 rounded-full"/>
                                ) : (
                                    <Icon icon="mdi:account-circle" width="28"/>
                                )}
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label="User menu">
                            <DropdownItem key="settings" onPress={() => navigate("/settings")}
                                          startContent={<Icon icon="mdi:cog" width="18"/>}>
                                Settings
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                )}
            </NavbarContent>

            <NavbarMenu className="bg-background/95 backdrop-blur-md pt-4">
                {navLinks.map(({label, path}) => (
                    <NavbarMenuItem key={path}>
                        <Link
                            to={path}
                            className={`flex items-center gap-3 w-full py-2 ${
                                isActive(path) ? "text-primary" : "text-foreground"
                            }`}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            {label}
                        </Link>
                    </NavbarMenuItem>
                ))}
                {libraries?.map((lib) => (
                    <NavbarMenuItem key={lib.key}>
                        <Link
                            to={`/library/${lib.key}`}
                            className="flex items-center gap-3 w-full py-2 text-foreground"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <Icon
                                icon={lib.type === "movie" ? "mdi:movie" : lib.type === "show" ? "mdi:television" : "mdi:folder"}
                                width="18"
                            />
                            {lib.title}
                        </Link>
                    </NavbarMenuItem>
                ))}
                <NavbarMenuItem>
                    <Link
                        to="/settings"
                        className="flex items-center gap-3 w-full py-2 text-foreground"
                        onClick={() => setIsMenuOpen(false)}
                    >
                        <Icon icon="mdi:cog" width="18"/>
                        Settings
                    </Link>
                </NavbarMenuItem>
            </NavbarMenu>
        </Navbar>
    );
}
