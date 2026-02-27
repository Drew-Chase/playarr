import {Button, ButtonGroup} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {format, startOfWeek, endOfWeek} from "date-fns";

export type CalendarView = "month" | "week" | "forecast" | "day";

interface CalendarToolbarProps {
    view: CalendarView;
    onViewChange: (view: CalendarView) => void;
    currentDate: Date;
    onBack: () => void;
    onForward: () => void;
    onToday: () => void;
}

function getTitle(view: CalendarView, currentDate: Date): string {
    switch (view) {
        case "month":
            return format(currentDate, "MMMM yyyy");
        case "week": {
            const ws = startOfWeek(currentDate, {weekStartsOn: 0});
            const we = endOfWeek(currentDate, {weekStartsOn: 0});
            const sameMonth = ws.getMonth() === we.getMonth();
            if (sameMonth) {
                return `${format(ws, "MMM d")} \u2013 ${format(we, "d, yyyy")}`;
            }
            return `${format(ws, "MMM d")} \u2013 ${format(we, "MMM d, yyyy")}`;
        }
        case "day":
            return format(currentDate, "EEEE, MMMM d, yyyy");
        case "forecast":
            return "Forecast";
    }
}

export default function CalendarToolbar({view, onViewChange, currentDate, onBack, onForward, onToday}: CalendarToolbarProps) {
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
                <Button isIconOnly variant="flat" size="sm" onPress={onBack} isDisabled={view === "forecast"}>
                    <Icon icon="mdi:chevron-double-left" width="18"/>
                </Button>
                <Button isIconOnly variant="flat" size="sm" onPress={onForward} isDisabled={view === "forecast"}>
                    <Icon icon="mdi:chevron-double-right" width="18"/>
                </Button>
                <Button variant="flat" size="sm" onPress={onToday}>
                    Today
                </Button>
            </div>

            <h1 className="text-xl font-semibold">{getTitle(view, currentDate)}</h1>

            <ButtonGroup variant="flat" size="sm">
                <Button
                    onPress={() => onViewChange("month")}
                    color={view === "month" ? "primary" : "default"}
                >
                    Month
                </Button>
                <Button
                    onPress={() => onViewChange("week")}
                    color={view === "week" ? "primary" : "default"}
                >
                    Week
                </Button>
                <Button
                    onPress={() => onViewChange("forecast")}
                    color={view === "forecast" ? "primary" : "default"}
                >
                    Forecast
                </Button>
                <Button
                    onPress={() => onViewChange("day")}
                    color={view === "day" ? "primary" : "default"}
                >
                    Day
                </Button>
            </ButtonGroup>
        </div>
    );
}
