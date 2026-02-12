interface DownloadProgressProps {
    progress: number;
}

export default function DownloadProgress({progress}: DownloadProgressProps) {
    return (
        <div className="w-full h-2 bg-default-200 rounded-full overflow-hidden">
            <div
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{width: `${Math.min(100, Math.max(0, progress))}%`}}
            />
        </div>
    );
}
