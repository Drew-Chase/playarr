import {setTitle} from "../../main.tsx";

export default function Home() {
    setTitle("Home")
    return (
        <>
            <h1 className="text-3xl font-bold underline">Home Page</h1>
        </>
    );
}