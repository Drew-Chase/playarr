import {format} from "date-fns";
import {Icon} from "@iconify-icon/react";
import type {CalendarEvent} from "../../lib/types.ts";
import CalendarEventBar from "./CalendarEventBar.tsx";

interface DayViewProps {
    currentDate: Date;
    eventsByDate: Map<string, CalendarEvent[]>;
}

export default function DayView({currentDate, eventsByDate}: DayViewProps) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const dayEvents = eventsByDate.get(dateStr) ?? [];

    if (dayEvents.length === 0) {
        return (
            <div className="text-center py-16">
                <Icon icon="mdi:calendar-blank" width="48" className="text-default-300 mx-auto mb-3"/>
                <p className="text-default-400">No events for this day</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {dayEvents.map(event => (
                <CalendarEventBar key={event.id} event={event} expanded/>
            ))}
        </div>
    );
}
