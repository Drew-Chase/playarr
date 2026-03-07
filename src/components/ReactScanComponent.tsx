import {useEffect} from "react";

export function ReactScanComponent()
{
    useEffect(() =>
    {
        // Create a script element
        const script = document.createElement("script");
        script.src = "https://unpkg.com/react-scan/dist/auto.global.js";
        script.async = true;

        // Append to the document to load it
        if (!document.body.contains(script))
            document.body.appendChild(script);

        // Cleanup function to remove the script when the component unmounts
        return () =>
        {
            if (document.body.contains(script))
            {
                document.body.removeChild(script);
            }
        };
    }, []);

    return <></>;
}