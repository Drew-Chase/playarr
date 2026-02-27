import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    format,
    isSameMonth,
} from "date-fns";
import type {CalendarEvent} from "../../lib/types.ts";
import CalendarDayCell from "./CalendarDayCell.tsx";

interface MonthViewProps {
    currentDate: Date;
    eventsByDate: Map<string, CalendarEvent[]>;
}

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonthView({currentDate, eventsByDate}: MonthViewProps) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, {weekStartsOn: 0});
    const calendarEnd = endOfWeek(monthEnd, {weekStartsOn: 0});
    const days = eachDayOfInterval({start: calendarStart, end: calendarEnd});
    const weekCount = days.length / 7;

    return (
        <div
            className="grid grid-cols-7 gap-px bg-content2 rounded-lg overflow-hidden flex-1"
            style={{gridTemplateRows: `auto repeat(${weekCount}, 1fr)`}}
        >
            {DAY_HEADERS.map(d => (
                <div key={d} className="bg-content1 py-2 text-center text-xs font-semibold text-default-500">
                    {d}
                </div>
            ))}
            {days.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                return (
                    <CalendarDayCell
                        key={dateStr}
                        date={day}
                        events={eventsByDate.get(dateStr) ?? []}
                        isCurrentMonth={isSameMonth(day, currentDate)}
                        compact
                    />
                );
            })}
        </div>
    );
}
