import {useParams} from "react-router-dom";
import {Button, Select, SelectItem, Spinner} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useState} from "react";
import {useLibraryItems, useLibraries} from "../hooks/usePlex";
import MediaGrid from "../components/media/MediaGrid";

const SORT_OPTIONS = [
    {key: "titleSort:asc", label: "Title A-Z"},
    {key: "titleSort:desc", label: "Title Z-A"},
    {key: "addedAt:desc", label: "Recently Added"},
    {key: "rating:desc", label: "Highest Rated"},
    {key: "year:desc", label: "Year (Newest)"},
    {key: "year:asc", label: "Year (Oldest)"},
];

const PAGE_SIZE = 50;

export default function Library() {
    const {key} = useParams<{ key: string }>();
    const [page, setPage] = useState(0);
    const [sort, setSort] = useState("addedAt:desc");
    const {data, isLoading} = useLibraryItems(key || "", page * PAGE_SIZE, PAGE_SIZE, sort);
    const {data: libraries} = useLibraries();

    const totalPages = data ? Math.ceil(data.totalSize / PAGE_SIZE) : 0;
    const libraryName = libraries?.find(l => l.key === key)?.title || "Library";

    return (
        <div className="px-6 md:px-12 lg:px-16 py-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{libraryName}</h1>
                <Select
                    selectedKeys={[sort]}
                    onChange={(e) => {
                        setSort(e.target.value);
                        setPage(0);
                    }}
                    className="w-48"
                    size="sm"
                    label="Sort by"
                >
                    {SORT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key}>{opt.label}</SelectItem>
                    ))}
                </Select>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Spinner size="lg"/>
                </div>
            ) : data?.items ? (
                <>
                    <MediaGrid items={data.items}/>
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-8">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                isDisabled={page === 0}
                                onPress={() => setPage(p => p - 1)}
                            >
                                <Icon icon="mdi:chevron-left" width="20"/>
                            </Button>
                            <span className="text-sm text-default-400">
                                Page {page + 1} of {totalPages}
                            </span>
                            <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                isDisabled={page >= totalPages - 1}
                                onPress={() => setPage(p => p + 1)}
                            >
                                <Icon icon="mdi:chevron-right" width="20"/>
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-16">
                    <Icon icon="mdi:movie-open-outline" width="48" className="text-default-300 mx-auto mb-3"/>
                    <p className="text-default-400">No items found</p>
                </div>
            )}
        </div>
    );
}
