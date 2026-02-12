import type {TmdbItem} from "../../lib/types.ts";
import {Card, CardFooter, Image} from "@heroui/react";
import {tmdbImage} from "../../lib/utils.ts";
import ContentRow from "../layout/ContentRow.tsx";
import RequestButton from "./RequestButton.tsx";

interface DiscoverRowProps {
    title: string;
    items: TmdbItem[];
    mediaType: "movie" | "tv";
}

export default function DiscoverRow({title, items, mediaType}: DiscoverRowProps) {
    if (!items || items.length === 0) return null;

    return (
        <ContentRow title={title}>
            {items.map((item) => {
                const itemTitle = item.title || item.name || "Unknown";
                return (
                    <Card key={item.id} className="shrink-0 w-[150px] bg-content2 border-none">
                        <Image
                            alt={itemTitle}
                            className="object-cover w-[150px] h-[225px]"
                            src={tmdbImage(item.poster_path, "w300")}
                            width={150}
                            height={225}
                        />
                        <CardFooter className="flex-col items-start p-2 gap-1">
                            <p className="text-xs font-semibold truncate w-full">{itemTitle}</p>
                            <RequestButton tmdbId={item.id} title={itemTitle} mediaType={mediaType}/>
                        </CardFooter>
                    </Card>
                );
            })}
        </ContentRow>
    );
}
