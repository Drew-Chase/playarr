import {useNavigate} from "react-router-dom";
import {Icon} from "@iconify-icon/react";
import type {CalendarEvent} from "../../lib/types.ts";

function getEventColors(event: CalendarEvent) {
    switch (event.status) {
        case "downloaded":
            return {bg: "bg-green-500/20", border: "border-l-green-500", text: "text-green-400"};
        case "downloaded_unmonitored":
            return {bg: "bg-green-800/20", border: "border-l-green-800", text: "text-green-600"};
        case "missing_monitored":
            return {bg: "bg-red-500/20", border: "border-l-red-500", text: "text-red-400"};
        case "missing_unmonitored":
            return {bg: "bg-orange-500/20", border: "border-l-orange-500", text: "text-orange-400"};
        case "unaired":
            return {bg: "bg-blue-500/20", border: "border-l-blue-500", text: "text-blue-400"};
        case "unreleased":
            return {bg: "bg-default-500/20", border: "border-l-default-500", text: "text-default-400"};
    }
}

function getEventRoute(event: CalendarEvent): string | null {
    if (event.type === "movie" && event.radarrMovie?.tmdbId) {
        return `/discover/movie/${event.radarrMovie.tmdbId}`;
    }
    if (event.type === "tv" && event.sonarrEpisode?.series?.tmdbId) {
        return `/discover/tv/${event.sonarrEpisode.series.tmdbId}`;
    }
    return null;
}

interface CalendarEventBarProps {
    event: CalendarEvent;
    compact?: boolean;
    expanded?: boolean;
}

export default function CalendarEventBar({event, compact = false, expanded = false}: CalendarEventBarProps) {
    const navigate = useNavigate();
    const colors = getEventColors(event);
    const route = getEventRoute(event);

    const handleClick = () => {
        if (route) navigate(route);
    };

    if (expanded) {
        return (
            <div
                className={`${colors.bg} border-l-3 ${colors.border} rounded-r-md p-3 flex gap-3 ${route ? "cursor-pointer hover:brightness-125 transition-all" : ""}`}
                onClick={handleClick}
            >
                {event.posterUrl && (
                    <img
                        src={event.posterUrl}
                        alt={event.title}
                        className="w-12 h-[72px] object-cover rounded shrink-0"
                        loading="lazy"
                    />
                )}
                <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${colors.text}`}>{event.title}</p>
                    {event.subtitle && (
                        <p className="text-xs text-default-400 mt-0.5">{event.subtitle}</p>
                    )}
                    {event.type === "movie" && event.radarrMovie?.certification && (
                        <span className="text-xs text-default-500 mt-1 inline-block">{event.radarrMovie.certification}</span>
                    )}
                    {event.type === "movie" && event.radarrMovie?.genres && event.radarrMovie.genres.length > 0 && (
                        <p className="text-xs text-default-500 mt-0.5">{event.radarrMovie.genres.join(", ")}</p>
                    )}
                </div>
                <div className="flex items-start pt-0.5">
                    <Icon
                        icon={event.type === "tv" ? "mdi:television" : "mdi:movie"}
                        width="16"
                        className="text-default-400"
                    />
                </div>
            </div>
        );
    }

    // Compact bar — used in month/week/forecast cells
    const label = compact && event.type === "tv"
        ? `${event.title} ${event.subtitle?.split(" - ")[0] ?? ""}`
        : event.title;

    return (
        <div
            className={`${colors.bg} border-l-2 ${colors.border} rounded-r-sm px-1.5 py-2 truncate ${route ? "cursor-pointer hover:brightness-125 transition-all" : "cursor-default"}`}
            title={`${event.title}${event.subtitle ? ` - ${event.subtitle}` : ""}`}
            onClick={handleClick}
        >
            <span className={`text-xs leading-tight ${colors.text} font-medium truncate block`}>
                {label}
            </span>
        </div>
    );
}
