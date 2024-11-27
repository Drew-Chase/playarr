import React from "react";
import {Button, cn, Link, Navbar, NavbarBrand, NavbarContent, NavbarMenu, NavbarMenuItem, NavbarMenuToggle} from "@nextui-org/react";
import {useLocation} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faGear, faPaperPlane, faSearch} from "@fortawesome/free-solid-svg-icons";
import PInput from "../Extends/PInput.tsx";

export default function Navigation()
{
    const {pathname} = useLocation();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const pages = {
        "Home": "/app/",
        "Movies": "/app/movies",
        "TV Shows": "/app/tv-shows"
    };
    const menuItems = Object.keys(pages).map((item, index) =>
    {
        const url = Object.values(pages)[index];
        const isCurrentPage = pathname === url;
        return (
            <NavbarMenuItem key={`${item}-${index}`}>
                <Link
                    href={url}
                    color={"foreground"}
                    aria-current="page"
                    size="lg"
                    className={
                        cn(
                            "w-full relative pb-1 text-foreground/50 transition-all",
                            "data-[active=true]:text-foreground"
                        )
                    }
                    data-active={isCurrentPage}
                >
                    {item}
                    <span
                        className={
                            cn(
                                "absolute bottom-0 w-full max-w-0 h-1 rounded-full bg-primary transition-all",
                                "data-[active=true]:max-w-full parent:hover:max-w-8"
                            )
                        }
                        data-active={isCurrentPage}
                    >

                    </span>
                </Link>
            </NavbarMenuItem>
        );
    });


    return (
        <Navbar onMenuOpenChange={setIsMenuOpen}>
            <NavbarContent>
                <NavbarBrand>
                    <p className="font-bold text-inherit">Playarr</p>
                </NavbarBrand>
            </NavbarContent>

            <NavbarContent className="hidden sm:flex gap-4" justify="center">
                {menuItems}
            </NavbarContent>
            <NavbarContent justify="end">
            </NavbarContent>

            <NavbarMenu>
                <div className={"flex flex-col gap-4 px-4 py-2 h-full"}>
                    <div className={"flex flex-row gap-2 items-center justify-between"}>
                        <PInput
                            label={"Search"}
                            placeholder="Ex: Comedy, South Park, Deadpool, 2020"
                            className={"w-full"}
                            startContent={
                                <FontAwesomeIcon icon={faSearch}/>
                            }
                            endContent={
                                <Button
                                    color="default"
                                    radius={"full"}
                                    className="w-8 h-8 min-h-0 min-w-0 text-tiny"
                                >
                                    <FontAwesomeIcon icon={faPaperPlane}/>
                                </Button>
                            }
                        />
                    </div>
                    <div className={"overflow-y-auto mb-auto flex flex-col gap-4"}>
                        {menuItems}
                    </div>
                    <div className={"w-full px-4 py-2 flex flex-row items-center justify-center"}>
                        <Button
                            color="primary"
                            radius={"full"}
                            className="mt-4 w-10 min-w-0"
                            onClick={() =>
                            {
                                window.location.href = "/app/settings";
                            }}
                        >
                            <FontAwesomeIcon icon={faGear}/>
                        </Button>
                    </div>
                </div>
            </NavbarMenu>
            <NavbarMenuToggle aria-label={isMenuOpen ? "Close menu" : "Open menu"} className="sm:hidden"/>
        </Navbar>);
}