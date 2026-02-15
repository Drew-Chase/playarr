import {useState} from "react";
import {Avatar, Checkbox, Input, Spinner} from "@heroui/react";
import {Icon} from "@iconify-icon/react";
import {useQuery} from "@tanstack/react-query";
import {api} from "../../lib/api.ts";
import type {PlexServerUser} from "../../lib/types.ts";

interface UserPickerProps {
    selectedIds: number[];
    onSelectionChange: (ids: number[]) => void;
}

export default function UserPicker({selectedIds, onSelectionChange}: UserPickerProps) {
    const [filter, setFilter] = useState("");
    const {data: users, isLoading} = useQuery({
        queryKey: ["plexUsers"],
        queryFn: () => api.get<PlexServerUser[]>("/plex/users"),
    });

    if (isLoading) {
        return <div className="flex justify-center py-4"><Spinner size="sm"/></div>;
    }

    const filtered = (users || []).filter(u =>
        u.username.toLowerCase().includes(filter.toLowerCase()) ||
        u.title.toLowerCase().includes(filter.toLowerCase())
    );

    const toggle = (id: number) => {
        if (selectedIds.includes(id)) {
            onSelectionChange(selectedIds.filter(i => i !== id));
        } else {
            onSelectionChange([...selectedIds, id]);
        }
    };

    return (
        <div className="space-y-2">
            <Input
                size="sm"
                placeholder="Filter users..."
                value={filter}
                onValueChange={setFilter}
                startContent={<Icon icon="mdi:magnify" width="16"/>}
                isClearable
                onClear={() => setFilter("")}
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
                {filtered.length === 0 && (
                    <p className="text-sm text-foreground/50 text-center py-2">No users found</p>
                )}
                {filtered.map(user => (
                    <div
                        key={user.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-content2 cursor-pointer"
                        onClick={() => toggle(user.id)}
                    >
                        <Checkbox
                            isSelected={selectedIds.includes(user.id)}
                            onValueChange={() => toggle(user.id)}
                            size="sm"
                        />
                        <Avatar src={user.thumb} name={user.username} size="sm"/>
                        <span className="text-sm">{user.title || user.username}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
