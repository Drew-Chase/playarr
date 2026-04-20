import {Tab, Tabs, Tooltip} from "@heroui/react";
import {Icon} from "@iconify-icon/react";

export type ViewMode = "landscape" | "portrait";

interface ViewToggleProps
{
    mode: ViewMode;
    onChange: (m: ViewMode) => void;
}

export default function ViewToggle({mode, onChange}: ViewToggleProps)
{
    return (
        <Tabs
            aria-label="View mode"
            size="sm"
            color="primary"
            variant="light"
            selectedKey={mode}
            onSelectionChange={(key) => onChange(key as ViewMode)}
        >
            <Tab
                key="landscape"
                title={
                    <Tooltip content={"Toggle Landscape view"} delay={1000} closeDelay={0}>
                        <div className="flex items-center space-x-2">
                            <Icon icon="mdi:view-agenda-outline" width="18"/>
                        </div>
                    </Tooltip>
                }
            />
            <Tab
                key="portrait"
                title={
                    <Tooltip content={"Toggle Portrait view"} delay={1000} closeDelay={0}>
                        <div className="flex items-center space-x-2">
                            <Icon icon="mdi:view-grid-outline" width="18"/>
                        </div>
                    </Tooltip>
                }
            />
        </Tabs>
    );
}
