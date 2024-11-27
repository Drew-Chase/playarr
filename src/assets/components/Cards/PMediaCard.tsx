import {cn} from "@nextui-org/react";
import {useEffect, useState} from "react";

interface PMediaCardProps
{
    id?: string;
    title?: string;
    subtitle?: string;
    year?: number;
    rating?: number;
    runtime?: number;
    tagline?: string;
    overview?: string;
    genres?: string[];
    trailer?: string;
    image?: string;
    type?: "movie" | "show" | "episode" | "season" | "person";
    installed?: boolean;
    watched?: boolean;
    progress?: number;
}

export default function PMediaCard(props: PMediaCardProps)
{
    const [id, setId] = useState(props.id ?? "");
    const [isHovering, setIsHovering] = useState(false);
    useEffect(() =>
    {
        if (!props.id)
        {
            setId(`media-card-${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}`);
        }
    }, []);

    useEffect(() =>
    {
        if(id)
        {

        }
    }, [id]);

    return (
        <div
            id={id}
            className={
                cn(
                    "w-48 aspect-[9/14] rounded-lg overflow-hidden shadow-lg shrink-0",
                    "bg-white/10"
                )
            }
        >
        </div>
    );
}