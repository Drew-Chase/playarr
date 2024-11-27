import {Popover, PopoverProps} from "@nextui-org/react";

export default function PPopover(props: PopoverProps)
{
    return (
        <Popover
            classNames={{
                ...props.classNames,
                content: "w-full bg-default-100/75  backdrop-blur-md"
            }}
            {...props}
        >
            {props.children}
        </Popover>
    );
}