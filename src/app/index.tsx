import {Pressable, PressableProps, Text, View} from "react-native";
import {useState} from "react";

export default function Home()
{
    const [count, setCount] = useState(0);
    return (
        <View className={"flex-1 items-center justify-center bg-black gap-4"}>
            <View className={"flex flex-row gap-4"}>
                <Button onPress={() => setCount(prev => prev - 1)}>-</Button>
                <Text className="text-4xl font-bold text-white underline">Count {count}</Text>
                <Button onPress={() => setCount(prev => prev + 1)}>+</Button>
            </View>
            <Button onPress={() => console.log("Test")}>Test</Button>
        </View>
    );
}


type ButtonProps = {
    children: string | React.ReactNode,
} & PressableProps

export function Button(props: ButtonProps)
{
    const [isFocused, setIsFocused] = useState(false);
    let child: React.ReactNode = props.children;
    if (typeof props.children === "string") child = <Text className={"text-white m-auto"}>{props.children}</Text>;
    const {onFocus, onBlur, className, ...rest} = props;
    return (
        <Pressable
            onFocus={(e) =>
            {
                setIsFocused(true);
                onFocus?.(e);
            }}
            onBlur={(e) =>
            {
                setIsFocused(false);
                onBlur?.(e);
            }}
            className={["px-4 h-10 rounded-md", isFocused ? "bg-blue-400" : "bg-blue-500", className].join(" ")}
            {...rest}
        >
            {child}
        </Pressable>
    );
}