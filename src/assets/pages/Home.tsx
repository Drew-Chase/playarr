import {setTitle} from "../../main.tsx";
import PCarousel from "../components/PCarousel.tsx";
import PMediaCard from "../components/Cards/PMediaCard.tsx";

export default function Home()
{
    setTitle("Home");
    return (
        <div className={"flex flex-col items-center justify-center w-full gap-4"}>
            <PCarousel
                title={"Popular"}
                subtitle={"Popular media"}
                href={"/movies/categories/popular"}
                showControls
                showIndicators
            >
                {Array.from({length: 100}).map((_, i) => (
                    <PMediaCard key={`${i}`}/>
                ))}
            </PCarousel>
        </div>
    );
}