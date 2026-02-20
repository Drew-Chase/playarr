import {useState, useEffect, useCallback} from "react";
import {Button, Progress} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useNavigate} from "react-router-dom";
import {AnimatePresence, motion} from "framer-motion";
import type {PlexMediaItem} from "../../lib/types.ts";
import {formatDuration, plexImage} from "../../lib/utils.ts";
import {useTmdbLogo} from "../../hooks/useTmdbLogo.ts";
import ResumePlaybackModal from "./ResumePlaybackModal.tsx";

interface HeroCarouselProps {
    items: PlexMediaItem[];
}

export default function HeroCarousel({items}: HeroCarouselProps) {
    const [current, setCurrent] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [showResumeModal, setShowResumeModal] = useState(false);
    const navigate = useNavigate();

    const next = useCallback(() => {
        setCurrent((c) => (c + 1) % items.length);
    }, [items.length]);

    const prev = useCallback(() => {
        setCurrent((c) => (c - 1 + items.length) % items.length);
    }, [items.length]);

    useEffect(() => {
        if (isPaused || items.length <= 1) return;
        const timer = setInterval(next, 8000);
        return () => clearInterval(timer);
    }, [isPaused, next, items.length]);

    if (items.length === 0) return null;

    const item = items[current];
    const {logoUrl} = useTmdbLogo(item);
    const progress = item.viewOffset && item.duration
        ? (item.viewOffset / item.duration) * 100
        : 0;

    const handlePlay = () => {
        if (item.type === "episode" || item.type === "movie") {
            if (item.viewOffset && item.duration) {
                setShowResumeModal(true);
            } else {
                navigate(`/player/${item.ratingKey}`);
            }
        } else {
            navigate(`/detail/${item.ratingKey}`);
        }
    };

    return (
        <>
        <div
            className="relative w-full h-[70vh] min-h-[700px] -mt-16 overflow-hidden group"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={item.ratingKey}
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    transition={{duration: 0.5}}
                    className="absolute inset-0"
                >
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                            backgroundImage: item.art ? `url(${plexImage(item.art, 1920, 1080)})` : undefined,
                        }}
                    />
                    {/* Bottom gradient */}
                    <div className="absolute inset-0 hero-gradient-bottom"/>
                    {/* Left gradient */}
                    <div className="absolute inset-0 hero-gradient-left opacity-60"/>
                </motion.div>
            </AnimatePresence>

            {/* Content */}
            <div className="absolute bottom-24 left-0 right-0 px-8 md:px-12 lg:px-16 z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={item.ratingKey + "-content"}
                        initial={{opacity: 0, y: -150}}
                        animate={{opacity: 1, y: -200}}
                        exit={{opacity: 0, y: -150}}
                        transition={{duration: 0.4}}
                    >
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={item.title}
                                className="max-h-24 md:max-h-32 w-auto object-contain mb-3"
                            />
                        ) : (
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-3">
                                {item.type === "season" && item.parentTitle
                                    ? item.parentTitle
                                    : item.type === "episode" && item.grandparentTitle
                                        ? item.grandparentTitle
                                        : item.title}
                            </h1>
                        )}
                        {item.type === "season" && (
                            <p className="text-lg text-white/50 mb-1">
                                {item.parentTitle && `${item.parentTitle} — `}{item.title}
                            </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-sm text-white/70 mb-3">
                            {item.type === "episode" && item.grandparentTitle && (
                                <span className="font-medium">{item.grandparentTitle}</span>
                            )}
                            {item.year && <span>{item.year}</span>}
                            {item.contentRating && (
                                <span className="px-2 py-0.5 border border-default-400 rounded text-xs">
                                    {item.contentRating}
                                </span>
                            )}
                            {item.duration && <span>{formatDuration(item.duration)}</span>}
                            {item.rating && (
                                <span className="flex items-center gap-1">
                                    <Icon icon="mdi:star" width="14" className="text-yellow-500"/>
                                    {item.rating.toFixed(1)}
                                </span>
                            )}
                            {item.type === "episode" && (
                                <span>
                                    S{item.parentIndex?.toString().padStart(2, "0")}E{item.index?.toString().padStart(2, "0")} - {item.title}
                                </span>
                            )}
                        </div>

                        <p className="text-sm md:text-base text-white/50 line-clamp-2 max-w-2xl mb-5">
                            {item.summary}
                        </p>

                        {progress > 0 && (
                            <div className="max-w-md mb-4">
                                <Progress
                                    size="sm"
                                    value={progress}
                                    classNames={{indicator: "bg-primary"}}
                                />
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button
                                color="primary"
                                radius="sm"
                                size="lg"
                                startContent={<Icon icon="mdi:play" width="24"/>}
                                onPress={handlePlay}
                                className="font-semibold"
                            >
                                {item.viewOffset ? "Resume" : "Play"}
                            </Button>
                            <Button
                                variant="ghost"
                                color={"secondary"}
                                radius="sm"
                                size="lg"
                                startContent={<Icon icon="mdi:information-outline" width="22"/>}
                                onPress={() => navigate(`/detail/${item.ratingKey}`)}
                            >
                                More Info
                            </Button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation arrows */}
            {items.length > 1 && (
                <>
                    <button
                        onClick={prev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                    >
                        <Icon icon="mdi:chevron-left" width="32" className="text-white"/>
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                    >
                        <Icon icon="mdi:chevron-right" width="32" className="text-white"/>
                    </button>
                </>
            )}

            {/* Dot indicators */}
            {items.length > 1 && (
                <div className="absolute bottom-48 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                    {items.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrent(i)}
                            className={`w-2 h-2 rounded-full transition-all ${
                                i === current ? "bg-primary w-6" : "bg-white/50 hover:bg-white/80"
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
        <ResumePlaybackModal
            isOpen={showResumeModal}
            onClose={() => setShowResumeModal(false)}
            ratingKey={item.ratingKey}
            viewOffset={item.viewOffset!}
            duration={item.duration!}
        />
        </>
    );
}
