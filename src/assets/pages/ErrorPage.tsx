import {setTitle} from "../../main.tsx";

interface ErrorPageProps
{
    code: number;
}

export default function ErrorPage(props: ErrorPageProps)
{
    setTitle(`Error ${props.code}`)
    return (
        <>
            <h1>Error {props.code}</h1>
        </>
    );
}