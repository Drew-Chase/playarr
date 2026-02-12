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
        themes: {
            light: {
                colors: {
                    primary: {
                        DEFAULT: "#17b36a",
                        foreground: "#fff",
                    },
                    secondary: "#2b2b2b",
                    background: "#e3e3ea",
                }
            },
            dark: {
                colors: {
                    primary: {
                        DEFAULT: "#1ce783",
                        foreground: "#000",
                    },
                    secondary: "#eaeaea",
                    background: "#0b0b0d",
                    content1: "#121214",
                    content2: "#18181c",
                    content3: "#222228",
                }
            },
        }
    })]
}
