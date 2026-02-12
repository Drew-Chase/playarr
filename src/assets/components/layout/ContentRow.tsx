import {ReactNode, useRef} from "react";
import {Button} from "@heroui/react";
import {Icon} from "@iconify-icon/react";

interface ContentRowProps {
    title: string;
    children: ReactNode;
    onSeeAll?: () => void;
}

export default function ContentRow({title, children, onSeeAll}: ContentRowProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current) return;
        const amount = scrollRef.current.clientWidth * 0.8;
        scrollRef.current.scrollBy({
            left: direction === "left" ? -amount : amount,
            behavior: "smooth",
        });
    };

    return (
        <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">{title}</h2>
                <div className="flex gap-1">
                    {onSeeAll && (
                        <Button size="sm" variant="light" onPress={onSeeAll}>
                            See All
                        </Button>
                    )}
                    <Button isIconOnly size="sm" variant="light" onPress={() => scroll("left")}>
                        <Icon icon="mdi:chevron-left" width="20"/>
                    </Button>
                    <Button isIconOnly size="sm" variant="light" onPress={() => scroll("right")}>
                        <Icon icon="mdi:chevron-right" width="20"/>
                    </Button>
                </div>
            </div>
            <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
                style={{scrollbarWidth: "none"}}
            >
                {children}
            </div>
        </section>
    );
}
