import {cn} from "@nextui-org/react";

interface PCarouselProps extends React.HTMLAttributes<HTMLDivElement>
{
    title?: string;
    subtitle?: string;
    action?:
    children: React.ReactNode;
}

export default function PCarousel(props: PCarouselProps)
{
    return (
        <div
            className={
                cn(
                    "",
                    props.className
                )
            }

        >
        </div>
    );
}