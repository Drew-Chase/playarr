import {Button, cn, Link, ScrollShadow} from "@nextui-org/react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faChevronLeft, faChevronRight} from "@fortawesome/free-solid-svg-icons";
import {HTMLAttributes, ReactNode, useEffect, useState} from "react";
import $ from "jquery";

interface PCarouselProps extends HTMLAttributes<HTMLDivElement>
{
    title?: string;
    subtitle?: string;
    href?: string;
    children: ReactNode[];
    classNames?: PCarouselClassNames;
    interval?: number;
    autoplay?: boolean;
    showControls?: boolean;
    showIndicators?: boolean;
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
    const [maxScrollPosition, setMaxScrollPosition] = useState(0);
    const [wrapperWidth, setWrapperWidth] = useState(0);
    const [containerElement, setContainerElement] = useState<HTMLElement | null>(null);
    const [page, setPage] = useState(0);
    const [lastPage, setLastPage] = useState(0);

    const next = () =>
    {
        if ((containerElement?.scrollLeft ?? 0) >= maxScrollPosition)
        {
            containerElement?.scrollTo({left: 0});
            setPage(0);
        } else
        {
            containerElement?.scrollBy({left: wrapperWidth - 100});
            setPage(prev => prev + 1);
        }
    };

    const previous = () =>
    {
        if ((containerElement?.scrollLeft ?? 0) <= 0)
        {
            setPage(prev => prev - 1);
            containerElement?.scrollTo({left: maxScrollPosition + 100});
        } else
        {
            setPage(prev => prev - 1);
            containerElement?.scrollBy({left: -wrapperWidth});
        }
    };

    useEffect(() =>
    {
        setLastPage(Math.ceil(maxScrollPosition / wrapperWidth));
    }, [props.children]);

    useEffect(() =>
    {
        if (id)
        {
            const scrollContainer = $(`#${id} [role="scroll-container"]`)[0];
            const width = ($(`#${id}`)[0].getBoundingClientRect().width ?? 0);
            setMaxScrollPosition(scrollContainer.scrollWidth - width);
            setWrapperWidth(width);
            setContainerElement(scrollContainer);
        }
    }, [id]);

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

            {props.showControls &&
                <div className={"flex flex-row w-full items-center justify-between"}>
                    <div className={"flex flex-col"}>
                        {props.href ?
                            <Link href={props.href} className={"text-xl font-semibold"}>{props.title}</Link> :
                            <p className={"text-xl font-semibold"}>{props.title}</p>
                        }
                        <p className={"opacity-70"}>{props.subtitle}</p>
                    </div>
                    <div className={"flex flex-row gap-4"}>
                        <Button
                            radius={"full"}
                            className={"mt-4 w-10 min-w-0"}
                            onClick={previous}
                        >
                            <FontAwesomeIcon icon={faChevronLeft}/>
                        </Button>
                        <Button
                            radius={"full"}
                            className={"mt-4 w-10 min-w-0"}
                            onClick={next}
                        >
                            <FontAwesomeIcon icon={faChevronRight}/>
                        </Button>
                    </div>
                </div>
            }
            <ScrollShadow
                orientation={"horizontal"}
                role={"scroll-container"}
                className={
                    cn(
                        "flex flex-row gap-4 items-center justify-start w-full overflow-x-scroll scrollbar-hides scroll-smooth",
                        props.classNames?.content ?? ""
                    )
                }

            >
                {props.children}
            </ScrollShadow>
            {props.showIndicators &&
                <div className={"flex flex-row gap-1 mx-auto"}>
                    {Array.from({length: lastPage}).map((_, index) =>
                        {
                            return (
                                <div
                                    key={`carousel-indicator-${id}-${index}`}
                                    className={"h-2 aspect-square rounded-full bg-neutral-700 data-[active=true]:bg-primary/50"}
                                    data-active={index === page}
                                ></div>
                            );
                        }
                    )}
                </div>
            }
        </div>
    );
}