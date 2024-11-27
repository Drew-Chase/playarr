import {nextui} from "@nextui-org/react";

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {},
    },
    darkMode: "class",
    plugins: [nextui({
        themes: {

            dark: {
                "colors": {
                    "primary": {
                        "DEFAULT": "#00cf85",
                        "foreground": "#0f0f0f",
                        "50": "#00a46f",
                        "100": "#00bb7d",
                        "200": "#00c68a",
                        "300": "#00d197",
                        "400": "#00cf85",
                        "500": "#00cc8f",
                        "600": "#00d392",
                        "700": "#00de99",
                        "800": "#00e8a0",
                        "900": "#00ffaf"
                    },
                    "secondary": {
                        "DEFAULT": "#1a77d3",
                        "foreground": "#0f0f0f",
                        "50": "#104179",
                        "100": "#154d86",
                        "200": "#1a5993",
                        "300": "#1f65a0",
                        "400": "#1a77d3",
                        "500": "#1584e0",
                        "600": "#1a91eb",
                        "700": "#1fa0f8",
                    },

                    "background": {
                        "DEFAULT": "#0f0f0f",
                        "foreground": "#fff",
                        "100": "#000000",
                        "200": "#0f0f0f",
                        "300": "#131313",
                        "400": "#1a1a1a",
                        "500": "#1f1f1f",
                        "600": "#282828",
                        "700": "#2c2c2c",
                        "800": "#2f2f2f",
                        "900": "#313131"
                    },

                    "neutral": {
                        "100": "#ffffff",
                        "200": "#d9e1fa",
                        "300": "#d1dbf9",
                        "400": "#aeb9e1",
                        "500": "#7e89ac",
                        "600": "#22282c",
                        "700": "#21232a",
                        "800": "#141518"
                    },
                    "system": {
                        "blue": {
                            "400": "#086cd9",
                            "300": "#1d88fe",
                            "200": "#8fc3ff",
                            "100": "#eaf4ff"
                        },
                        "green": {
                            "400": "#11845b",
                            "300": "#05c168",
                            "200": "#7fdca4",
                            "100": "#def2e6"
                        },
                        "red": {
                            "400": "#dc2b2b",
                            "300": "#ff5a65",
                            "200": "#ffbec2",
                            "100": "#ffeff0"
                        },
                        "orange": {
                            "400": "#d5691b",
                            "300": "#ff9e2c",
                            "200": "#ffd19b",
                            "100": "#fff3e4"
                        }
                    }

                },
            }
        }
    })]
}