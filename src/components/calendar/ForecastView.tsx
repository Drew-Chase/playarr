import {subDays, addDays, eachDayOfInterval, format, isToday} from "date-fns";
import type {CalendarEvent} from "../../lib/types.ts";
import CalendarDayCell from "./CalendarDayCell.tsx";

interface ForecastViewProps {
    eventsByDate: Map<string, CalendarEvent[]>;
}

function getDayLabel(day: Date): string {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const dayStr = format(day, "yyyy-MM-dd");
    const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");
    const tomorrowStr = format(addDays(today, 1), "yyyy-MM-dd");

    if (dayStr === yesterdayStr) return "Yesterday";
    if (dayStr === todayStr) return "Today";
    if (dayStr === tomorrowStr) return "Tomorrow";
    return format(day, "EEEE");
}

export default function ForecastView({eventsByDate}: ForecastViewProps) {
    const forecastStart = subDays(new Date(), 1);
    const forecastEnd = addDays(new Date(), 5);
    const days = eachDayOfInterval({start: forecastStart, end: forecastEnd});

    return (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-px bg-content2 rounded-lg overflow-hidden flex-1">
            {days.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const today = isToday(day);
                return (
                    <div key={dateStr} className="flex flex-col min-h-0">
                        <div className={`bg-content1 py-2 text-center text-xs font-semibold ${today ? "text-primary" : "text-default-500"}`}>
                            {getDayLabel(day)}
                        </div>
                        <div className="flex-1">
                            <CalendarDayCell
                                date={day}
                                events={eventsByDate.get(dateStr) ?? []}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
