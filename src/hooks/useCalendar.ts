import {useQuery} from "@tanstack/react-query";
import {useMemo} from "react";
import {api} from "../lib/api.ts";
import type {
    SonarrCalendarEpisode,
    RadarrCalendarMovie,
    CalendarEvent,
    CalendarEventStatus,
} from "../lib/types.ts";
import {arrPosterUrl} from "../lib/utils.ts";
import {isBefore} from "date-fns";

export function useSonarrCalendar(start: string, end: string) {
    return useQuery({
        queryKey: ["sonarr", "calendar", start, end],
        queryFn: () => api.get<SonarrCalendarEpisode[]>("/sonarr/calendar", {start, end}),
        staleTime: 60_000,
    });
}

export function useRadarrCalendar(start: string, end: string) {
    return useQuery({
        queryKey: ["radarr", "calendar", start, end],
        queryFn: () => api.get<RadarrCalendarMovie[]>("/radarr/calendar", {start, end}),
        staleTime: 60_000,
    });
}

export function useCalendarEvents(start: string, end: string) {
    const sonarr = useSonarrCalendar(start, end);
    const radarr = useRadarrCalendar(start, end);

    const events = useMemo(() => {
        const result: CalendarEvent[] = [];
        const now = new Date();

        for (const ep of sonarr.data ?? []) {
            const airDate = ep.airDate ?? ep.airDateUtc?.slice(0, 10) ?? null;
            if (!airDate) continue;

            let status: CalendarEventStatus;
            if (ep.hasFile) {
                status = "downloaded";
            } else if (isBefore(new Date(airDate + "T23:59:59"), now)) {
                status = ep.monitored ? "missing_monitored" : "missing_unmonitored";
            } else {
                status = "unaired";
            }

            result.push({
                id: `sonarr-${ep.id}`,
                type: "tv",
                date: airDate,
                title: ep.series?.title ?? "Unknown Series",
                subtitle: `S${String(ep.seasonNumber).padStart(2, "0")}E${String(ep.episodeNumber).padStart(2, "0")} - ${ep.title}`,
                status,
                posterUrl: ep.series ? arrPosterUrl(ep.series.images) : null,
                isSeasonPremiere: ep.episodeNumber === 1,
                isSeriesPremiere: ep.seasonNumber === 1 && ep.episodeNumber === 1,
                sonarrEpisode: ep,
            });
        }

        for (const movie of radarr.data ?? []) {
            const releaseDate = movie.digitalRelease?.slice(0, 10)
                ?? movie.physicalRelease?.slice(0, 10)
                ?? movie.inCinemas?.slice(0, 10)
                ?? null;
            if (!releaseDate) continue;

            let status: CalendarEventStatus;
            if (movie.hasFile && movie.monitored) {
                status = "downloaded";
            } else if (movie.hasFile && !movie.monitored) {
                status = "downloaded_unmonitored";
            } else if (!movie.hasFile && movie.status === "released") {
                status = movie.monitored ? "missing_monitored" : "missing_unmonitored";
            } else {
                status = "unreleased";
            }

            result.push({
                id: `radarr-${movie.id}`,
                type: "movie",
                date: releaseDate,
                title: movie.title,
                status,
                posterUrl: arrPosterUrl(movie.images),
                radarrMovie: movie,
            });
        }

        result.sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
        return result;
    }, [sonarr.data, radarr.data]);

    return {
        events,
        isLoading: sonarr.isLoading || radarr.isLoading,
        isError: sonarr.isError || radarr.isError,
    };
}
