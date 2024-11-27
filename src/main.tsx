import React from "react";
import {BrowserRouter, Route, Routes, useNavigate} from "react-router-dom";
import ReactDOM from "react-dom/client";
import $ from "jquery";
import {NextUIProvider} from "@nextui-org/react";

import "./assets/scss/index.scss";
import Home from "./assets/pages/Home.tsx";
import About from "./assets/pages/About.tsx";
import Navigation from "./assets/components/Navigation/Navigation.tsx";
import ErrorPage from "./assets/pages/ErrorPage.tsx";


export const setTitle = (title: string) =>
{
    document.title = `${title} - Playarr`;
};

ReactDOM.createRoot($("#root")[0]!).render(
    <React.StrictMode>
        <BrowserRouter>
            <MainContentRenderer/>
        </BrowserRouter>
    </React.StrictMode>
);

export function MainContentRenderer()
{
    const navigate = useNavigate();
    return (
        <NextUIProvider navigate={navigate}>
            <Navigation/>
            <Routes>
                <Route>
                    <Route path="/" element={<About/>}/>
                    <Route path="/app" element={<Home/>}/>

                    <Route path="*" element={<ErrorPage code={404}/>}/>
                </Route>
            </Routes>
        </NextUIProvider>
    )
        ;
}
