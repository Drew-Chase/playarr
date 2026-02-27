import {useMemo, useState} from "react";
import {Spinner} from "@heroui/react";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    addDays,
    subDays,
} from "date-fns";
import {useCalendarEvents} from "../hooks/useCalendar.ts";
import CalendarToolbar, {type CalendarView} from "../components/calendar/CalendarToolbar.tsx";
import MonthView from "../components/calendar/MonthView.tsx";
import WeekView from "../components/calendar/WeekView.tsx";
import ForecastView from "../components/calendar/ForecastView.tsx";
import DayView from "../components/calendar/DayView.tsx";
import type {CalendarEvent} from "../lib/types.ts";

function computeDateRange(view: CalendarView, currentDate: Date): {start: string; end: string} {
    switch (view) {
        case "month": {
            const ms = startOfMonth(currentDate);
            const me = endOfMonth(currentDate);
            return {
                start: format(startOfWeek(ms, {weekStartsOn: 0}), "yyyy-MM-dd"),
                end: format(endOfWeek(me, {weekStartsOn: 0}), "yyyy-MM-dd"),
            };
        }
        case "week": {
            return {
                start: format(startOfWeek(currentDate, {weekStartsOn: 0}), "yyyy-MM-dd"),
                end: format(endOfWeek(currentDate, {weekStartsOn: 0}), "yyyy-MM-dd"),
            };
        }
        case "day": {
            const d = format(currentDate, "yyyy-MM-dd");
            return {start: d, end: d};
        }
        case "forecast": {
            return {
                start: format(subDays(new Date(), 1), "yyyy-MM-dd"),
                end: format(addDays(new Date(), 5), "yyyy-MM-dd"),
            };
        }
    }
}

export default function Calendar() {
    const [view, setView] = useState<CalendarView>("month");
    const [currentDate, setCurrentDate] = useState(new Date());

    const {start, end} = useMemo(
        () => computeDateRange(view, currentDate),
        [view, currentDate]
    );

    const {events, isLoading} = useCalendarEvents(start, end);

    const eventsByDate = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        for (const event of events) {
            const existing = map.get(event.date) ?? [];
            existing.push(event);
            map.set(event.date, existing);
        }
        return map;
    }, [events]);

    const goBack = () => {
        switch (view) {
            case "month": setCurrentDate(prev => subMonths(prev, 1)); break;
            case "week": setCurrentDate(prev => subWeeks(prev, 1)); break;
            case "day": setCurrentDate(prev => subDays(prev, 1)); break;
        }
    };

    const goForward = () => {
        switch (view) {
            case "month": setCurrentDate(prev => addMonths(prev, 1)); break;
            case "week": setCurrentDate(prev => addWeeks(prev, 1)); break;
            case "day": setCurrentDate(prev => addDays(prev, 1)); break;
        }
    };

    const goToday = () => setCurrentDate(new Date());

    return (
        <div className="px-4 md:px-12 lg:px-16 py-4 flex flex-col" style={{minHeight: "calc(100vh - 4rem)"}}>
            <CalendarToolbar
                view={view}
                onViewChange={setView}
                currentDate={currentDate}
                onBack={goBack}
                onForward={goForward}
                onToday={goToday}
            />

            {isLoading ? (
                <div className="flex justify-center py-12 flex-1">
                    <Spinner size="lg"/>
                </div>
            ) : (
                <div className="flex flex-col flex-1 min-h-0">
                    {view === "month" && <MonthView currentDate={currentDate} eventsByDate={eventsByDate}/>}
                    {view === "week" && <WeekView currentDate={currentDate} eventsByDate={eventsByDate}/>}
                    {view === "forecast" && <ForecastView eventsByDate={eventsByDate}/>}
                    {view === "day" && <DayView currentDate={currentDate} eventsByDate={eventsByDate}/>}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 py-2 text-xs text-default-400">
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-green-500"/> Downloaded
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-blue-500"/> Unaired
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-red-500"/> Missing (Monitored)
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-orange-500"/> Missing (Unmonitored)
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-default-500"/> Unreleased
                </span>
            </div>
        </div>
    );
}
