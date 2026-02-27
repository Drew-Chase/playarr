import {useEffect, useMemo, useRef, useState} from "react";
import {format, isToday} from "date-fns";
import type {CalendarEvent} from "../../lib/types.ts";
import CalendarEventBar from "./CalendarEventBar.tsx";

interface CalendarDayCellProps {
    date: Date;
    events: CalendarEvent[];
    isCurrentMonth?: boolean;
    compact?: boolean;
}

export default function CalendarDayCell({date, events, isCurrentMonth = true, compact = false}: CalendarDayCellProps) {
    const today = isToday(date);
    const listRef = useRef<HTMLDivElement>(null);
    const [hiddenCount, setHiddenCount] = useState(0);

    const posterEvent = useMemo(() => {
        const seriesPremiere = events.find(e => e.isSeriesPremiere && e.posterUrl);
        if (seriesPremiere) return seriesPremiere;
        const seasonPremiere = events.find(e => e.isSeasonPremiere && e.posterUrl);
        if (seasonPremiere) return seasonPremiere;
        const movie = events.find(e => e.type === "movie" && e.posterUrl);
        if (movie) return movie;
        return null;
    }, [events]);

    useEffect(() => {
        const el = listRef.current;
        if (!el) { setHiddenCount(0); return; }

        const check = () => {
            const children = Array.from(el.children) as HTMLElement[];
            // Last child might be the "+N more" indicator, skip it
            const eventChildren = children.filter(c => !c.dataset.overflow);
            let count = 0;
            for (const child of eventChildren) {
                if (child.offsetTop + child.offsetHeight > el.clientHeight) {
                    count++;
                }
            }
            setHiddenCount(count);
        };

        check();
        const observer = new ResizeObserver(check);
        observer.observe(el);
        return () => observer.disconnect();
    }, [events]);

    return (
        <div
            className={`
                relative bg-content1 p-1.5 md:p-2 flex flex-col overflow-hidden
                ${!isCurrentMonth ? "opacity-40" : ""}
                ${today ? "ring-1 ring-inset ring-primary/50" : ""}
            `}
        >
            {posterEvent?.posterUrl && (
                <>
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-15"
                        style={{backgroundImage: `url(${posterEvent.posterUrl})`}}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-content1 via-content1/80 to-content1/40"/>
                </>
            )}

            <div className="relative z-10 mb-1">
                <span className={`
                    text-xs font-semibold
                    ${today
                    ? "bg-primary text-black w-6 h-6 rounded-full inline-flex items-center justify-center"
                    : "text-default-500"}
                `}>
                    {format(date, "d")}
                </span>
            </div>

            <div ref={listRef} className="relative z-10 flex flex-col gap-[3px] flex-1 overflow-hidden">
                {events.map(event => (
                    <CalendarEventBar key={event.id} event={event} compact={compact}/>
                ))}
                {hiddenCount > 0 && (
                    <span data-overflow="true" className="text-xs text-default-400 pl-1 shrink-0">
                        +{hiddenCount} more
                    </span>
                )}
            </div>
        </div>
    );
}
