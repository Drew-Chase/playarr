import {Button, cn, ScrollShadow} from "@nextui-org/react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faChevronLeft, faChevronRight} from "@fortawesome/free-solid-svg-icons";
import {useEffect, useState} from "react";
import $ from "jquery";

interface PCarouselProps extends React.HTMLAttributes<HTMLDivElement>
{
    title?: string;
    subtitle?: string;
    action?: () => void;
    children: React.ReactNode;
    classNames?: PCarouselClassNames;

}

interface PCarouselClassNames
{
    wrapper?: string;
    title?: string;
    subtitle?: string;
    action?: string;
    content?: string;
}

export default function PCarousel(props: PCarouselProps)
{
    const [id, setId] = useState("");
    const [scrollPosition, setScrollPosition] = useState(0);
    const [scrollWidth, setScrollWidth] = useState(0);

    const next = () =>
    {
        const scrollContainer = $(`#${id} [role="scroll-container"]`);
        scrollContainer.scrollLeft(30)
        console.log(scrollContainer);

    };

    useEffect(() =>
    {
        setId(`carousel-${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}`);
    }, []);


    return (
        <div
            id={id}
            className={cn(
                "flex flex-col items-start justify-start w-full gap-4 p-4 relative",
                props.className ?? "",
                props.classNames?.wrapper ?? ""
            )}>
            <div className={"flex flex-row w-full items-center justify-between"}>
                <div className={"flex flex-col"}>
                    <p className={"text-xl font-semibold"}>{props.title}</p>
                    <p className={"opacity-70"}>{props.subtitle}</p>
                </div>
                {props.action && (
                    <Button
                        radius={"full"}
                        className={"mt-4 w-10 min-w-0"}
                        onClick={props.action}
                    >
                        <FontAwesomeIcon icon={faChevronRight}/>
                    </Button>
                )}
            </div>
            <div className={"w-[98%] flex flex-row justify-between absolute top-1/2 -translate-y-1/3 left-1/2 -translate-x-1/2 z-10"}>
                <Button
                    radius={"full"}
                    className={"mt-4 min-w-0 h-16 aspect-square"}
                    onClick={props.action}
                >
                    <FontAwesomeIcon icon={faChevronLeft}/>
                </Button>

                <Button
                    radius={"full"}
                    className={"mt-4 min-w-0 h-16 aspect-square"}
                    onClick={next}
                >
                    <FontAwesomeIcon icon={faChevronRight}/>
                </Button>
            </div>
            <ScrollShadow
                orientation={"horizontal"}
                role={"scroll-container"}
                className={
                    cn(
                        "flex flex-row gap-4 items-center justify-start w-full overflow-x-scroll scrollbar-hide scroll-smooth",
                        props.classNames?.content ?? ""
                    )
                }

            >
                {props.children}
            </ScrollShadow>
        </div>
    );
}