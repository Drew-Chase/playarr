import {useCallback, useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {Icon} from "@iconify-icon/react";
import type {PlexMediaItem} from "../../lib/types.ts";
import {formatDuration} from "../../lib/utils.ts";
import {plexApi} from "../../lib/plex.ts";

const CARD_WIDTH = 300;
const CARD_GAP = 16;

interface CreditsOverlayProps {
    nextEpisode: PlexMediaItem;
    artUrl: string;
    onPlayNext: () => void;
    onCancel: () => void;
    relatedId: string;
}

export default function CreditsOverlay({nextEpisode, artUrl, onPlayNext, onCancel, relatedId}: CreditsOverlayProps) {
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(10);
    const [timerPaused, setTimerPaused] = useState(false);

    const stablePlayNext = useCallback(onPlayNext, []);

    useEffect(() => {
        if (timerPaused) return;

        const interval = window.setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    stablePlayNext();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [stablePlayNext, timerPaused]);

    const {data: related} = useQuery({
        queryKey: ["plex", "related", relatedId],
        queryFn: () => plexApi.getRelated(relatedId),
        enabled: !!relatedId,
        staleTime: 5 * 60 * 1000,
    });

    // Carousel state
    const carouselRef = useRef<HTMLDivElement>(null);
    const [activePage, setActivePage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(3);
    const [hoveringCarousel, setHoveringCarousel] = useState(false);

    const relatedItems = related?.slice(0, 12) ?? [];
    const totalPages = Math.max(1, Math.ceil(relatedItems.length / itemsPerPage));

    // Measure container to calculate items per page
    useEffect(() => {
        const el = carouselRef.current;
        if (!el || relatedItems.length === 0) return;
        const measure = () => {
            const width = el.offsetWidth;
            setItemsPerPage(Math.max(1, Math.floor((width + CARD_GAP) / (CARD_WIDTH + CARD_GAP))));
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [relatedItems.length]);

    // Reset page when items per page changes
    useEffect(() => {
        setActivePage(p => Math.min(p, Math.max(0, totalPages - 1)));
    }, [totalPages]);

    // Auto-scroll every 5s (paused on hover)
    useEffect(() => {
        if (totalPages <= 1 || hoveringCarousel) return;
        const interval = window.setInterval(() => {
            setActivePage(p => (p + 1) % totalPages);
        }, 5000);
        return () => clearInterval(interval);
    }, [totalPages, hoveringCarousel]);

    return (
        <div className="absolute inset-0 z-30">
            {/* Background art */}
            <div className="absolute inset-0">
                {artUrl ? (
                    <img
                        src={artUrl}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-content1"/>
                )}
                <div className="absolute inset-0 bg-black/60"/>
            </div>

            {/* Click target over mini video — cancel auto-play */}
            <button
                onClick={onCancel}
                className="absolute top-8 left-8 min-w-[360px] w-[30%] aspect-video z-40 cursor-pointer
                           rounded-lg ring-2 ring-white/20 hover:ring-white/60 transition-all
                           bg-transparent"
                aria-label="Cancel auto-play, return to full screen"
            >
                <div className="absolute inset-0 flex items-center justify-center
                                opacity-0 hover:opacity-100 transition-opacity
                                bg-black/40 rounded-lg">
                    <Icon icon="mdi:arrow-expand-all" width="32" className="text-white"/>
                </div>
            </button>

            {/* You May Also Like — carousel below mini video */}
            {relatedItems.length > 0 && (
                <div
                    className="absolute left-8 right-[calc(30vw+4rem)] bottom-4 z-30 flex flex-col"
                    onMouseEnter={() => setHoveringCarousel(true)}
                    onMouseLeave={() => setHoveringCarousel(false)}
                >
                    <p className="text-white text-3xl font-medium mb-3">You May Also Like</p>
                    <div ref={carouselRef} className="overflow-hidden flex-1 min-h-0">
                        <div
                            className="flex gap-4 transition-transform duration-500 ease-in-out"
                            style={{transform: `translateX(-${activePage * itemsPerPage * (CARD_WIDTH + CARD_GAP)}px)`}}
                        >
                            {relatedItems.map(item => (
                                <div
                                    key={item.ratingKey}
                                    className="shrink-0 cursor-pointer group"
                                    style={{width: CARD_WIDTH}}
                                    onClick={() => navigate(`/detail/${item.ratingKey}`)}
                                >
                                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-content3">
                                        <img
                                            src={`/api/media/${item.ratingKey}/thumb`}
                                            alt={item.title}
                                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                            <Icon icon="mdi:play-circle" width="40"
                                                  className="text-white/0 group-hover:text-white/90 transition-colors"/>
                                        </div>
                                    </div>
                                    <p className="text-white text-xs font-medium mt-2 truncate">
                                        {item.title}
                                    </p>
                                    {item.year && (
                                        <p className="text-white/40 text-xs">
                                            {item.year}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Pill pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-3">
                            {Array.from({length: totalPages}, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActivePage(i)}
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        i === activePage ? "w-6 bg-primary" : "w-2 bg-white/30 hover:bg-white/50"
                                    }`}
                                    aria-label={`Page ${i + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Next episode card — bottom right */}
            <div className="absolute bottom-10 right-10 w-[680px] max-w-[40vw]">
                <p className="text-white/70 text-sm font-medium mb-3">Up Next</p>
                <div
                    className="bg-content1/90 backdrop-blur-md rounded-xl overflow-hidden
                               shadow-2xl border border-white/10 cursor-pointer
                               hover:border-white/30 transition-colors"
                    onClick={onPlayNext}
                >
                    <div className="flex gap-5 p-5">
                        {/* Thumbnail */}
                        <div className="relative w-64 min-w-[16rem] aspect-video rounded-lg overflow-hidden bg-content3 shrink-0">
                            <img
                                src={`/api/media/${nextEpisode.ratingKey}/thumb`}
                                alt={nextEpisode.title}
                                className="object-cover w-full h-full"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Icon icon="mdi:play-circle-outline" width="56" className="text-white/80"/>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 py-1">
                            {nextEpisode.grandparentTitle && (
                                <p className="text-sm text-white/50 truncate">
                                    {nextEpisode.grandparentTitle}
                                </p>
                            )}
                            <p className="text-lg font-semibold text-white truncate mt-0.5">
                                S{nextEpisode.parentIndex?.toString().padStart(2, "0")}
                                E{nextEpisode.index?.toString().padStart(2, "0")}
                                {" \u2014 "}
                                {nextEpisode.title}
                            </p>
                            <p className="text-sm text-white/50 mt-1">
                                {formatDuration(nextEpisode.duration)}
                                {nextEpisode.contentRating && ` \u00B7 ${nextEpisode.contentRating}`}
                            </p>
                            {nextEpisode.summary && (
                                <p className="text-sm text-white/70 mt-3 line-clamp-3">
                                    {nextEpisode.summary}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Countdown bar */}
                    <div className="px-5 pb-4 flex items-center gap-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); setTimerPaused(p => !p); }}
                            className="text-primary shrink-0 hover:text-white transition-colors"
                            aria-label={timerPaused ? "Resume countdown" : "Pause countdown"}
                        >
                            <Icon icon={timerPaused ? "mdi:play" : "mdi:pause"} width="20"/>
                        </button>
                        <span className="text-base font-medium text-white whitespace-nowrap">
                            {timerPaused
                                ? "Autoplay paused"
                                : `Playing in ${countdown} second${countdown !== 1 ? "s" : ""}`
                            }
                        </span>
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden ml-2">
                            <div
                                className={`h-full bg-primary rounded-full ${timerPaused ? "" : "transition-all duration-1000 ease-linear"}`}
                                style={{width: `${((10 - countdown) / 10) * 100}%`}}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
