interface PMediaCardProps
{
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
    return (
        <>
        </>
    );
}