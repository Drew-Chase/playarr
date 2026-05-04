import React, {useCallback, useEffect, useRef, useState} from "react";
import {View, Text, Pressable, BackHandler, StyleSheet} from "react-native";
import {LinearGradient} from "expo-linear-gradient";
import {colors, spacing, components} from "@/theme/tokens";
import {SearchIcon, DownloadIcon, PlayIcon} from "@/components/icons";

interface TopNavProps
{
    active?: string;
}

const NAV_ITEMS = ["Home", "Movies", "TV Shows", "Calendar"];
const GRADIENT_HEIGHT = components.topNav.height + 64;

export function TopNav({active = "Home"}: TopNavProps)
{
    // Track how many nav children currently hold focus. Using a ref avoids
    // re-renders on every focus change; we only need the latest value when
    // the back button fires.
    const focusedCount = useRef(0);

    // Bumped each time we want to programmatically refocus the active nav item
    // (e.g. on back press). Used as the React key for the active item so it
    // remounts and `hasTVPreferredFocus` takes effect again.
    const [refocusTick, setRefocusTick] = useState(0);

    const onItemFocus = useCallback(() =>
    {
        focusedCount.current += 1;
    }, []);

    const onItemBlur = useCallback(() =>
    {
        focusedCount.current = Math.max(0, focusedCount.current - 1);
    }, []);

    useEffect(() =>
    {
        const sub = BackHandler.addEventListener("hardwareBackPress", () =>
        {
            if (focusedCount.current === 0)
            {
                setRefocusTick((t) => t + 1);
                return true; // consume — prevent default back navigation
            }
            return false; // nav already focused, let default behavior run
        });
        return () => sub.remove();
    }, []);

    return (
        <View style={styles.container} pointerEvents="box-none">
            <LinearGradient colors={["rgba(0,0,0,0.85)", "rgba(0,0,0,0)"]} locations={[0, 1]} style={styles.gradient} pointerEvents="none"/>
            <View style={styles.row}>
                <View style={styles.left}>
                    <BrandMark/>
                </View>

                <View style={styles.center}>
                    {NAV_ITEMS.map((item) =>
                    {
                        const isActive = item === active;
                        const shouldForceFocus = refocusTick > 0 && isActive;
                        return (
                            <Pressable key={shouldForceFocus ? `${item}-${refocusTick}` : item} hasTVPreferredFocus={shouldForceFocus} onFocus={onItemFocus} onBlur={onItemBlur} style={styles.navItem}>
                                {({focused}: { focused?: boolean }) => (
                                    <View style={[styles.navItemInner, focused && styles.navItemFocused]}>
                                        <Text style={[styles.navText, isActive && styles.navTextActive]}>{item}</Text>
                                        {isActive && !focused && <View style={styles.activeIndicator}/>}
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>

                <View style={styles.right}>
                    <SearchIcon size={22} color={colors.textDim}/>
                    <DownloadIcon size={22} color={colors.textDim}/>
                    <View style={styles.avatar}/>
                </View>
            </View>
        </View>
    );
}

function BrandMark()
{
    return (
        <View style={styles.brand}>
            <View style={styles.brandCircle}>
                <PlayIcon size={Math.round(components.brandMark.size * components.brandMark.iconScale)} color={colors.accentOnDark}/>
            </View>
            <Text style={styles.brandText}>Playarr</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: components.topNav.height,
        zIndex: 10
    },
    gradient: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: GRADIENT_HEIGHT
    },
    row: {
        height: components.topNav.height,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing["5xl"]
    },
    left: {
        flex: 1
    },
    center: {
        flexDirection: "row",
        gap: spacing["2xl"],
        justifyContent: "center"
    },
    right: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: spacing.xl
    },
    navItem: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs
    },
    navItemInner: {
        position: "relative",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        marginHorizontal: -spacing.md,
        marginVertical: -spacing.xs,
        borderRadius: 4
    },
    navItemFocused: {
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 5
    },
    navText: {
        fontSize: 20,
        fontWeight: "500",
        color: colors.textDim
    },
    navTextActive: {
        color: colors.text
    },
    activeIndicator: {
        position: "absolute",
        bottom: -spacing.xs - 4,
        left: spacing.md + 4,
        right: spacing.md + 4,
        height: 2,
        backgroundColor: colors.accent,
        borderRadius: 1
    },
    brand: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md
    },
    brandCircle: {
        width: components.brandMark.size,
        height: components.brandMark.size,
        borderRadius: components.brandMark.size / 2,
        backgroundColor: colors.accent,
        alignItems: "center",
        justifyContent: "center"
    },
    brandText: {
        fontSize: 22,
        fontWeight: "600",
        letterSpacing: -0.01 * 22,
        color: colors.text
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)"
    }
});
