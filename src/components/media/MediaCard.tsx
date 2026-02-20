import {useState} from "react";
import {Progress} from "@heroui/react";
import {useNavigate} from "react-router-dom";
import {motion} from "framer-motion";
import {Icon} from "@iconify-icon/react";
import type {PlexMediaItem} from "../../lib/types.ts";
import {plexImage} from "../../lib/utils.ts";
import ResumePlaybackModal from "./ResumePlaybackModal.tsx";

interface MediaCardProps
{
    item: PlexMediaItem;
    showProgress?: boolean;
    variant?: "portrait" | "landscape";
    width?: number;
}

export default function MediaCard({item, showProgress, width, variant = "portrait"}: MediaCardProps)
{
    const navigate = useNavigate();
    const [showResumeModal, setShowResumeModal] = useState(false);

    const handleClick = () =>
    {
        navigate(`/detail/${item.ratingKey}`);
    };

    const handlePlay = (e: React.MouseEvent) =>
    {
        e.stopPropagation();
        if (item.viewOffset && item.duration)
        {
            setShowResumeModal(true);
        }
        else
        {
            navigate(`/player/${item.ratingKey}`);
        }
    };

    const resumeModal = (
        <ResumePlaybackModal
            isOpen={showResumeModal}
            onClose={() => setShowResumeModal(false)}
            ratingKey={item.ratingKey}
            viewOffset={item.viewOffset!}
            duration={item.duration!}
        />
    );

    const progress = item.viewOffset && item.duration
        ? (item.viewOffset / item.duration) * 100
        : 0;

    const title = item.type === "episode" && item.grandparentTitle
        ? item.grandparentTitle
        : item.title;

    const subtitle = item.type === "episode"
        ? `S${item.parentIndex?.toString().padStart(2, "0")}E${item.index?.toString().padStart(2, "0")} ${item.title}`
        : item.year?.toString() || "";

    if (variant === "landscape")
    {
        const artUrl = plexImage(item.art, 560, 316) || plexImage(item.thumb, 560, 316);

        return (
            <>
                <motion.div
                    whileHover={{scale: 1.05}}
                    transition={{type: "tween", duration: 0.2}}
                    className="shrink-0 cursor-pointer group scroll-snap-start"
                    onClick={handleClick}
                >
                    <div className="relative aspect-[3/1.5] rounded-lg overflow-hidden bg-content2" style={{width: width ?? "280px"}}>
                        <img
                            alt={item.title}
                            className="object-cover w-full h-full"
                            src={artUrl}
                            loading="lazy"
                        />
                        {/* Hover play overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={handlePlay}>
                                <Icon icon="mdi:play-circle" width="48" className="text-white"/>
                            </button>
                        </div>
                        {/* Bottom gradient for title */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                            <p className="text-sm font-semibold text-white truncate">{title}</p>
                            {subtitle && <p className="text-xs text-white/70 truncate">{subtitle}</p>}
                        </div>
                        {/* Progress bar */}
                        {showProgress && progress > 0 && (
                            <div className="absolute bottom-0 left-0 right-0">
                                <Progress
                                    size="sm"
                                    value={progress}
                                    className="rounded-none"
                                    classNames={{
                                        indicator: "bg-primary",
                                        track: "bg-black/50 rounded-none"
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </motion.div>
                {resumeModal}
            </>
        );
    }

    // Portrait variant (default)
    const thumbUrl = item.thumb ? `/api/media/${item.ratingKey}/thumb` : "";

    return (
        <>
            <motion.div
                whileHover={{scale: 1.05}}
                transition={{type: "tween", duration: 0.2}}
                className="cursor-pointer group"
                onClick={handleClick}
            >
                <div className="relative rounded-lg overflow-hidden bg-content2 aspect-[2/3]" style={{width: width ?? "unset"}}>
                    <img
                        alt={item.title}
                        className="object-cover w-full h-full"
                        src={thumbUrl}
                        loading="lazy"
                    />
                    {/* Hover play overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={handlePlay}>
                            <Icon icon="mdi:play-circle" width="48" className="text-white"/>
                        </button>
                    </div>
                    {/* Hover ring glow */}
                    <div className="absolute inset-0 rounded-lg ring-0 group-hover:ring-2 ring-primary/50 transition-all"/>
                    {/* Progress bar */}
                    {showProgress && progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0">
                            <Progress
                                size="sm"
                                value={progress}
                                className="rounded-none"
                                classNames={{
                                    indicator: "bg-primary",
                                    track: "bg-black/50 rounded-none"
                                }}
                            />
                        </div>
                    )}
                </div>
                <div className="mt-2 px-1" style={{maxWidth: width ?? "unset"}}>
                    <p className="text-sm font-semibold truncate">{title}</p>
                    <p className="text-xs text-default-400 truncate">{subtitle}</p>
                </div>
            </motion.div>
            {resumeModal}
        </>
    );
}
