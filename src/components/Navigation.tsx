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
    useDisclosure, DropdownSection
} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useAuth} from "../providers/AuthProvider.tsx";
import {useWatchPartyContext} from "../providers/WatchPartyProvider.tsx";
import {useLibraries} from "../hooks/usePlex.ts";
import SettingsModal from "./settings/SettingsModal.tsx";

export default function Navigation()
{
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [searchOpen, setSearchOpen] = React.useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const {user, isAuthenticated, isAdmin, logout} = useAuth();
    const watchParty = useWatchPartyContext();
    const {data: libraries} = useLibraries();
    const {isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose} = useDisclosure();

    const handleSearch = (e: React.FormEvent) =>
    {
        e.preventDefault();
        if (searchQuery.trim())
        {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearchOpen(false);
        }
    };

    const isActive = (path: string) => location.pathname === path;

    const movieLibraries = libraries?.filter(l => l.type === "movie") || [];
    const tvLibraries = libraries?.filter(l => l.type === "show") || [];

    return (
        <>
            <Navbar
                onMenuOpenChange={setIsMenuOpen}
                maxWidth="full"
                className="bg-background/80 backdrop-blur-md border-none fixed top-0 z-[99]"
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
                    <NavbarItem>
                        <Link
                            to="/"
                            className={`text-sm font-medium transition-colors ${
                                isActive("/") ? "text-primary" : "text-foreground/70 hover:text-foreground"
                            }`}
                        >
                            Home
                        </Link>
                    </NavbarItem>

                    {movieLibraries.length === 1 ? (
                        <NavbarItem>
                            <Link
                                to={`/library/${movieLibraries[0].key}`}
                                className={`text-sm font-medium transition-colors ${
                                    location.pathname === `/library/${movieLibraries[0].key}` ? "text-primary" : "text-foreground/70 hover:text-foreground"
                                }`}
                            >
                                {movieLibraries[0].title}
                            </Link>
                        </NavbarItem>
                    ) : movieLibraries.length > 1 ? (
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
                    ) : null}

                    {tvLibraries.length === 1 ? (
                        <NavbarItem>
                            <Link
                                to={`/library/${tvLibraries[0].key}`}
                                className={`text-sm font-medium transition-colors ${
                                    location.pathname === `/library/${tvLibraries[0].key}` ? "text-primary" : "text-foreground/70 hover:text-foreground"
                                }`}
                            >
                                {tvLibraries[0].title}
                            </Link>
                        </NavbarItem>
                    ) : tvLibraries.length > 1 ? (
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
                    ) : null}

                    <NavbarItem>
                        <Link
                            to="/discover"
                            className={`text-sm font-medium transition-colors ${
                                isActive("/discover") ? "text-primary" : "text-foreground/70 hover:text-foreground"
                            }`}
                        >
                            Discover
                        </Link>
                    </NavbarItem>
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
                                    onClear={() =>
                                    {
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
                                {[
                                    <DropdownItem key="downloads" onPress={() => navigate("/downloads")}
                                                  startContent={<Icon icon="mdi:download" width="18"/>}>
                                        Downloads
                                    </DropdownItem>,
                                    <DropdownSection key="watch-party-section" title={"Watch Party"} showDivider>
                                        {(watchParty?.isInParty ? [
                                            <DropdownItem key="leave-party" color="warning" className="text-warning"
                                                          onPress={watchParty.leaveParty}
                                                          startContent={<Icon icon="mdi:exit-run" width="18"/>}>
                                                Leave Watch Party
                                            </DropdownItem>,
                                            watchParty.isHost && (
                                                <DropdownItem key="close-party" color="danger" className="text-danger"
                                                              onPress={watchParty.closeParty}
                                                              startContent={<Icon icon="mdi:close-circle" width="18"/>}>
                                                    Close Watch Party
                                                </DropdownItem>
                                            )
                                        ] : [
                                            <DropdownItem key="create-party"
                                                          onPress={watchParty?.openCreateModal}
                                                          startContent={<Icon icon="mdi:plus-circle" width="18"/>}>
                                                Create Watch Party
                                            </DropdownItem>,
                                            <DropdownItem key="join-party"
                                                          onPress={watchParty?.openJoinModal}
                                                          startContent={<Icon icon="mdi:account-group" width="18"/>}>
                                                Join Watch Party
                                            </DropdownItem>
                                        ]).filter((item): item is React.ReactElement => !!item)}
                                    </DropdownSection>,
                                    isAdmin && (
                                        <DropdownItem key="settings" onPress={onSettingsOpen}
                                                      startContent={<Icon icon="mdi:cog" width="18"/>}>
                                            Settings
                                        </DropdownItem>
                                    ),
                                    <DropdownItem key="logout" color="danger" className="text-danger"
                                                  onPress={logout}
                                                  startContent={<Icon icon="mdi:logout" width="18"/>}>
                                        Sign Out
                                    </DropdownItem>
                                ].filter((item): item is React.ReactElement => !!item)}
                            </DropdownMenu>
                        </Dropdown>
                    )}
                </NavbarContent>

                <NavbarMenu className="bg-background/95 backdrop-blur-md pt-4">
                    <NavbarMenuItem>
                        <Link
                            to="/"
                            className={`flex items-center gap-3 w-full py-2 ${
                                isActive("/") ? "text-primary" : "text-foreground"
                            }`}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Home
                        </Link>
                    </NavbarMenuItem>
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
                            to="/discover"
                            className={`flex items-center gap-3 w-full py-2 ${
                                isActive("/discover") ? "text-primary" : "text-foreground"
                            }`}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <Icon icon="mdi:compass" width="18"/>
                            Discover
                        </Link>
                    </NavbarMenuItem>
                    <NavbarMenuItem>
                        <Link
                            to="/downloads"
                            className={`flex items-center gap-3 w-full py-2 ${
                                isActive("/downloads") ? "text-primary" : "text-foreground"
                            }`}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <Icon icon="mdi:download" width="18"/>
                            Downloads
                        </Link>
                    </NavbarMenuItem>
                    {watchParty?.isInParty ? (
                        <>
                            <NavbarMenuItem>
                                <button
                                    className="flex items-center gap-3 w-full py-2 text-warning"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        watchParty.leaveParty();
                                    }}
                                >
                                    <Icon icon="mdi:exit-run" width="18"/>
                                    Leave Watch Party
                                </button>
                            </NavbarMenuItem>
                            {watchParty.isHost && (
                                <NavbarMenuItem>
                                    <button
                                        className="flex items-center gap-3 w-full py-2 text-danger"
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            watchParty.closeParty();
                                        }}
                                    >
                                        <Icon icon="mdi:close-circle" width="18"/>
                                        Close Watch Party
                                    </button>
                                </NavbarMenuItem>
                            )}
                        </>
                    ) : (
                        <>
                            <NavbarMenuItem>
                                <button
                                    className="flex items-center gap-3 w-full py-2 text-foreground"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        watchParty?.openCreateModal();
                                    }}
                                >
                                    <Icon icon="mdi:plus-circle" width="18"/>
                                    Create Watch Party
                                </button>
                            </NavbarMenuItem>
                            <NavbarMenuItem>
                                <button
                                    className="flex items-center gap-3 w-full py-2 text-foreground"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        watchParty?.openJoinModal();
                                    }}
                                >
                                    <Icon icon="mdi:account-group" width="18"/>
                                    Join Watch Party
                                </button>
                            </NavbarMenuItem>
                        </>
                    )}
                    {isAdmin && (
                        <NavbarMenuItem>
                            <button
                                className="flex items-center gap-3 w-full py-2 text-foreground"
                                onClick={() =>
                                {
                                    setIsMenuOpen(false);
                                    onSettingsOpen();
                                }}
                            >
                                <Icon icon="mdi:cog" width="18"/>
                                Settings
                            </button>
                        </NavbarMenuItem>
                    )}
                    <NavbarMenuItem>
                        <button
                            className="flex items-center gap-3 w-full py-2 text-danger"
                            onClick={() =>
                            {
                                setIsMenuOpen(false);
                                logout();
                            }}
                        >
                            <Icon icon="mdi:logout" width="18"/>
                            Sign Out
                        </button>
                    </NavbarMenuItem>
                </NavbarMenu>
            </Navbar>
            <SettingsModal isOpen={isSettingsOpen} onClose={onSettingsClose}/>
        </>
    );
}
