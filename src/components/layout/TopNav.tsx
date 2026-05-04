import React, {useCallback, useEffect, useRef, useState} from "react";
import {View, Text, Pressable, BackHandler, StyleSheet, LayoutChangeEvent, findNodeHandle} from "react-native";
import Animated, {interpolateColor, useAnimatedStyle, useSharedValue, withTiming} from "react-native-reanimated";
import {LinearGradient} from "expo-linear-gradient";
import {colors, spacing, components} from "@/theme/tokens";
import {SearchIcon, DownloadIcon, PlayIcon} from "@/components/icons";

interface TopNavProps
{
    active?: string;
}

const NAV_ITEMS = ["Home", "Movies", "TV Shows", "Calendar"];
const GRADIENT_HEIGHT = components.topNav.height + 64;
const FOCUS_ANIM_MS = 180;
const FOCUS_PAD_X = spacing.md;
const FOCUS_PAD_Y = 0;

interface ItemLayout
{
    x: number;
    y: number;
    width: number;
    height: number;
}

export function TopNav({active = "Home"}: TopNavProps)
{
    // Track how many nav children currently hold focus. Using a ref avoids
    // re-renders on every focus change; we only need the latest value when
    // the back button fires.
    const focusedCount = useRef(0);

    // Bumped each time we want to programmatically refocus the active nav item
    // (e.g., on back press). Used as the React key for the active item, so it
    // remounts and `hasTVPreferredFocus` takes effect again.
    const [refocusTick, setRefocusTick] = useState(0);

    // Cached layout per nav item so the sliding indicator knows where to
    // animate to when focus moves between items.
    const layoutsRef = useRef<Record<string, ItemLayout>>({});

    // Holds a deferred fade-out so a blur immediately followed by a focus
    // (i.e. moving between items) doesn't cause a flicker.
    const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const indicatorX = useSharedValue(0);
    const indicatorY = useSharedValue(0);
    const indicatorW = useSharedValue(0);
    const indicatorH = useSharedValue(0);
    const indicatorOpacity = useSharedValue(0);

    const handleItemFocus = useCallback((item: string) =>
    {
        focusedCount.current += 1;
        if (blurTimeoutRef.current)
        {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
        }
        const layout = layoutsRef.current[item];
        if (!layout) return;
        const targetX = layout.x - FOCUS_PAD_X;
        const targetY = layout.y - FOCUS_PAD_Y;
        const targetW = layout.width + FOCUS_PAD_X * 2;
        const targetH = layout.height + FOCUS_PAD_Y * 2;
        if (indicatorOpacity.value === 0)
        {
            // First appearance — snap to position so it doesn't fly in from origin.
            indicatorX.value = targetX;
            indicatorY.value = targetY;
            indicatorW.value = targetW;
            indicatorH.value = targetH;
        } else
        {
            indicatorX.value = withTiming(targetX, {duration: FOCUS_ANIM_MS});
            indicatorY.value = withTiming(targetY, {duration: FOCUS_ANIM_MS});
            indicatorW.value = withTiming(targetW, {duration: FOCUS_ANIM_MS});
            indicatorH.value = withTiming(targetH, {duration: FOCUS_ANIM_MS});
        }
        indicatorOpacity.value = withTiming(1, {duration: FOCUS_ANIM_MS});
    }, [indicatorH, indicatorOpacity, indicatorW, indicatorX, indicatorY]);

    const handleItemBlur = useCallback(() =>
    {
        focusedCount.current = Math.max(0, focusedCount.current - 1);
        if (focusedCount.current === 0)
        {
            // Defer so an immediate focus on a sibling cancels the fade-out.
            blurTimeoutRef.current = setTimeout(() =>
            {
                indicatorOpacity.value = withTiming(0, {duration: FOCUS_ANIM_MS});
                blurTimeoutRef.current = null;
            }, 0);
        }
    }, [indicatorOpacity]);

    const handleItemLayout = useCallback((item: string, e: LayoutChangeEvent) =>
    {
        const {x, y, width, height} = e.nativeEvent.layout;
        layoutsRef.current[item] = {x, y, width, height};
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

    useEffect(() =>
    {
        return () =>
        {
            if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
        };
    }, []);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{translateX: indicatorX.value}, {translateY: indicatorY.value}],
        width: indicatorW.value,
        height: indicatorH.value,
        opacity: indicatorOpacity.value
    }));

    return (
        <View style={styles.container} pointerEvents="box-none">
            <LinearGradient
                colors={["rgba(0,0,0,0.85)", "rgba(0,0,0,0)"]}
                locations={[0, 1]}
                style={styles.gradient} pointerEvents="none"
            />
            <View style={styles.row}>
                <View style={styles.left}>
                    <BrandMark/>
                </View>

                <View style={styles.center}>
                    <Animated.View style={[styles.focusIndicator, indicatorStyle]} pointerEvents="none"/>
                    {NAV_ITEMS.map((item, idx) =>
                    {
                        const isActive = item === active;
                        const shouldForceFocus = refocusTick > 0 && isActive;
                        return (
                            <NavItem
                                key={shouldForceFocus ? `${item}-${refocusTick}` : item}
                                item={item}
                                isActive={isActive}
                                hasTVPreferredFocus={shouldForceFocus}
                                onFocus={handleItemFocus}
                                onBlur={handleItemBlur}
                                onLayout={handleItemLayout}
                                trapLeft={idx === 0}
                            />
                        );
                    })}
                </View>

                <View style={styles.right}>
                    <IconButton
                        render={(focused) =>
                            <SearchIcon size={22} color={focused ? colors.text : colors.textDim}/>}/>
                    <IconButton
                        render={(focused) =>
                            <DownloadIcon size={22} color={focused ? colors.text : colors.textDim}/>}/>
                    <IconButton
                        trapRight
                        render={(focused) =>
                            <View style={[styles.avatar, focused && styles.avatarFocused]}/>}/>
                </View>
            </View>
        </View>
    );
}

interface NavItemProps
{
    item: string;
    isActive: boolean;
    hasTVPreferredFocus: boolean;
    onFocus: (item: string) => void;
    onBlur: () => void;
    onLayout: (item: string, e: LayoutChangeEvent) => void;
    trapLeft?: boolean;
    trapRight?: boolean;
}

function NavItem(props: NavItemProps)
{
    const {
        item,
        isActive,
        hasTVPreferredFocus,
        onFocus, onBlur,
        onLayout,
        trapLeft,
        trapRight
    } = props;
    const [focused, setFocused] = useState(false);
    const progress = useSharedValue(isActive ? 1 : 0);
    const pressableRef = useRef<View>(null);
    const [selfHandle, setSelfHandle] = useState<number | null>(null);

    useEffect(() =>
    {
        progress.value = withTiming(focused || isActive ? 1 : 0, {duration: FOCUS_ANIM_MS});
    }, [focused, isActive, progress]);

    useEffect(() =>
    {
        setSelfHandle(findNodeHandle(pressableRef.current));
    }, []);

    const textStyle = useAnimatedStyle(() => ({
        color: interpolateColor(progress.value, [0, 1], [colors.textDim, colors.text])
    }));

    return (
        <Pressable
            ref={pressableRef}
            hasTVPreferredFocus={hasTVPreferredFocus}
            nextFocusLeft={trapLeft && selfHandle !== null ? selfHandle : undefined}
            nextFocusRight={trapRight && selfHandle !== null ? selfHandle : undefined}
            onFocus={() =>
            {
                setFocused(true);
                onFocus(item);
            }}
            onBlur={() =>
            {
                setFocused(false);
                onBlur();
            }}
            onLayout={(e) => onLayout(item, e)}
            style={styles.navItem}
        >
            <View style={styles.navItemInner}>
                <Animated.Text style={[styles.navText, textStyle]}>{item}</Animated.Text>
                {isActive && <View style={styles.activeIndicator}/>}
            </View>
        </Pressable>
    );
}

interface IconButtonProps
{
    render: (focused: boolean) => React.ReactNode;
    trapLeft?: boolean;
    trapRight?: boolean;
}

function IconButton({render, trapLeft, trapRight}: IconButtonProps)
{
    const ref = useRef<View>(null);
    const [selfHandle, setSelfHandle] = useState<number | null>(null);

    useEffect(() =>
    {
        setSelfHandle(findNodeHandle(ref.current));
    }, []);

    return (
        <Pressable
            ref={ref}
            nextFocusLeft={trapLeft && selfHandle !== null ? selfHandle : undefined}
            nextFocusRight={trapRight && selfHandle !== null ? selfHandle : undefined}
            style={styles.iconButton}
        >
            {({focused}: { focused?: boolean }) => render(!!focused)}
        </Pressable>
    );
}

function BrandMark()
{
    return (
        <View style={styles.brand}>
            <View style={styles.brandCircle}>
                <PlayIcon
                    size={Math.round(components.brandMark.size * components.brandMark.iconScale)}
                    color={colors.accentOnDark}
                />
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
        gap: spacing.sm
    },
    iconButton: {
        padding: spacing.sm,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center"
    },
    focusIndicator: {
        position: "absolute",
        top: 0,
        left: 0,
        backgroundColor: colors.accentGlow,
        borderRadius: 5
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
    },
    avatarFocused: {
        borderColor: colors.text,
        borderWidth: 2
    }
});
