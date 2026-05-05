import { Link, usePathname } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

const pages = [
    { label: "Home", href: "/" as const },
    { label: "About", href: "/about" as const },
];

export default function Navigation() {
    const pathname = usePathname();

    return (
        <View className="flex-row items-center gap-6 px-8 py-4 bg-neutral-900 border-b border-neutral-800">
            <Text className="text-2xl font-bold text-white mr-4">playarr</Text>
            {pages.map((page) => {
                const isActive = pathname === page.href;
                return (
                    <NavLink
                        key={page.href}
                        href={page.href}
                        label={page.label}
                        isActive={isActive}
                    />
                );
            })}
        </View>
    );
}

function NavLink({
    href,
    label,
    isActive,
}: {
    href: "/" | "/about";
    label: string;
    isActive: boolean;
}) {
    const [focused, setFocused] = useState(false);

    return (
        <Link href={href} asChild>
            <Pressable
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className={`px-4 py-2 rounded-md ${
                    focused ? "bg-red-500" : "bg-transparent"
                }`}
            >
                <Text
                    className={`text-lg ${
                        isActive ? "text-red-500 font-semibold" : "text-white"
                    } ${focused ? "text-white" : ""}`}
                >
                    {label}
                </Text>
            </Pressable>
        </Link>
    );
}
