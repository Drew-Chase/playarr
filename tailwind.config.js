import {heroui} from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
        fontFamily: {
            sans: ['Roboto', 'sans-serif'],
        },
        extend: {},
    },
    darkMode: "class",
    plugins: [heroui({
        layout: {
            disabledOpacity: "0.3", // opacity-[0.3]
            radius: {
                small: "2px", // rounded-small
                medium: "4px", // rounded-medium
                large: "6px", // rounded-large
            },
        },
        themes: {
            dark: {
                colors: {
                    primary: {
                        DEFAULT: "#1ce783",
                        foreground: "#000",
                    },
                    secondary: {
                        DEFAULT: "#eaeaea",
                        foreground: "#000"
                    },
                    background: "#0b0b0d",
                    content1: "#121214",
                    content2: "#18181c",
                    content3: "#222228",
                }
            },
        }
    })]
}
