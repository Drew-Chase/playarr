import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import Navigation from "@/components/Navigation";
import "../global.css";

export default function RootLayout() {
    return (
        <SafeAreaView className="flex-1 bg-black">
            <Navigation />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: "black" },
                }}
            />
        </SafeAreaView>
    );
}
