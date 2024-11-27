import {cn, Input, InputProps} from "@nextui-org/react";

export default function PInput(props: InputProps)
{
    return (
        <Input
            classNames={{...props.classNames, inputWrapper: cn("bg-neutral-700 data-[focus]:!bg-neutral-800 data-[hover]:!bg-neutral-800", props.classNames?.inputWrapper)}}
            {...props}
        />
    );
}