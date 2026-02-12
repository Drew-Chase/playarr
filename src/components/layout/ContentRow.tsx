import {ReactNode, useRef} from "react";
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
        <section className="mb-8 group/row px-6 md:px-12 lg:px-16">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">{title}</h2>
                    {onSeeAll && (
                        <button
                            onClick={onSeeAll}
                            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                        >
                            MORE <Icon icon="mdi:chevron-right" width="16"/>
                        </button>
                    )}
                </div>
            </div>
            <div className="relative">
                {/* Left scroll button */}
                <button
                    onClick={() => scroll("left")}
                    className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-black/80"
                >
                    <Icon icon="mdi:chevron-left" width="28" className="text-white"/>
                </button>

                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 scroll-snap-x"
                    style={{scrollbarWidth: "none"}}
                >
                    {children}
                </div>

                {/* Right scroll button */}
                <button
                    onClick={() => scroll("right")}
                    className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-black/80"
                >
                    <Icon icon="mdi:chevron-right" width="28" className="text-white"/>
                </button>
            </div>
        </section>
    );
}
