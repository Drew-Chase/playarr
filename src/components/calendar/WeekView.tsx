import {startOfWeek, endOfWeek, eachDayOfInterval, format, isToday} from "date-fns";
import type {CalendarEvent} from "../../lib/types.ts";
import CalendarDayCell from "./CalendarDayCell.tsx";

interface WeekViewProps {
    currentDate: Date;
    eventsByDate: Map<string, CalendarEvent[]>;
}

export default function WeekView({currentDate, eventsByDate}: WeekViewProps) {
    const weekStart = startOfWeek(currentDate, {weekStartsOn: 0});
    const weekEnd = endOfWeek(currentDate, {weekStartsOn: 0});
    const days = eachDayOfInterval({start: weekStart, end: weekEnd});

    return (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-px bg-content2 rounded-lg overflow-hidden flex-1">
            {days.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const today = isToday(day);
                return (
                    <div key={dateStr} className="flex flex-col min-h-0">
                        <div className={`bg-content1 py-2 text-center text-xs font-semibold ${today ? "text-primary" : "text-default-500"}`}>
                            {format(day, "EEE")}
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
