import {useParams} from "react-router-dom";
import {Button, Select, SelectItem, Spinner} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useState} from "react";
import {useLibraryItems} from "../hooks/usePlex";
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

    const totalPages = data ? Math.ceil(data.totalSize / PAGE_SIZE) : 0;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Library</h1>
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
                        <div className="flex justify-center items-center gap-2 mt-6">
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
                <p className="text-default-400 text-center py-12">No items found</p>
            )}
        </div>
    );
}
