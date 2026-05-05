import {ThemedView} from "@/components/themed-view";
import {Platform, TVFocusGuideView as NativeTVFocusGuideView} from "react-native";

export const TVFocusGuideView = (props: any) =>
{
    if (Platform.OS === "web")
    {
        return <ThemedView {...props} />;
    }
    return <NativeTVFocusGuideView {...props} />;
};
