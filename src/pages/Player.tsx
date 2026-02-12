import {useParams} from "react-router-dom";
import {Spinner} from "@heroui/react";
import {useMetadata} from "../hooks/usePlex.ts";
import VideoPlayer from "../components/player/VideoPlayer.tsx";

export default function Player() {
    const {id} = useParams<{ id: string }>();
    const {data: item, isLoading} = useMetadata(id || "");

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-black">
                <Spinner size="lg" color="white"/>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="flex justify-center items-center h-screen bg-black text-white">
                Media not found
            </div>
        );
    }

    return <VideoPlayer item={item}/>;
}
