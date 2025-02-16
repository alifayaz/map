import { useEffect, useState } from "react";
import "@neshan-maps-platform/react-openlayers/dist/style.css";
import { Input, List, Button, Modal, Spin } from "antd";
import NeshanMap, { OlMap, Ol } from "@neshan-maps-platform/react-openlayers";

const SEARCH_HISTORY_KEY = "search_history";
const SEARCH_API_KEY = "service.9f65201c41984830af6c3f0484296bfc";

interface Place {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
}

function App() {
    const [ol, setOl] = useState<Ol | null>(null);
    const [olMap, setOlMap] = useState<OlMap | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>({ latitude: 36.2951944, longitude: 59.5987236 });
    const [overlays, setOverlays] = useState<Ol.Overlay[]>([]);

    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                (error) => {
                    console.error("Error getting location: ", error);
                }
            );
        }
    }, []);

    useEffect(() => {
        const storedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
        if (storedHistory) {
            setSearchHistory(JSON.parse(storedHistory));
        }
    }, []);

    const updateSearchHistory = (term: string) => {
        const updatedHistory = [...new Set([term, ...searchHistory])].slice(0, 20);
        setSearchHistory(updatedHistory);
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
    };

    const searchPlaces = async () => {
        updateSearchHistory(searchTerm);
        setLoading(true);

        try {
            const response = await fetch(
                `https://api.neshan.org/v1/search?term=${encodeURIComponent(searchTerm)}&lat=${userLocation?.latitude}&lng=${userLocation?.longitude}`,
                {
                    headers: {
                        "Api-Key": SEARCH_API_KEY,
                    },
                }
            );

            if (!response.ok) throw new Error("مشکلی در دریافت داده‌ها رخ داد");

            const data = await response.json();
            const results: Place[] = data.items.map((item: any) => ({
                id: item.id,
                name: item.title,
                latitude: item.location.y,
                longitude: item.location.x,
            }));

            if (results.length > 0 && olMap && ol) {
                const view = (olMap as any).getView();
                view.animate({
                    center: ol.proj.fromLonLat([results[0].longitude, results[0].latitude]),
                    zoom: 14,
                    duration: 1000,
                });

                overlays.forEach((overlay) => (olMap as any).removeOverlay(overlay));
                setOverlays([]);

                const newOverlays: Ol.Overlay[] = results.map((place) => {
                    const markerElement = document.createElement("div");
                    markerElement.innerHTML = "📍";
                    markerElement.style.fontSize = "24px";
                    markerElement.style.cursor = "pointer";
                    markerElement.onclick = () => setSelectedPlace(place);

                    const overlay = new ol.Overlay({
                        position: ol.proj.fromLonLat([place.longitude, place.latitude]),
                        element: markerElement,
                    });

                    (olMap as any).addOverlay(overlay);
                    return overlay;
                });

                setOverlays(newOverlays);
            }
        } catch (error) {
            console.error("خطا در جستجو:", error);
        } finally {
            setLoading(false);
        }
    };

    const onInit = (olInstance: Ol, map: OlMap) => {
        setOl(olInstance);
        setOlMap(map);
    };

    return (
        <div style={{ padding: "10px" }}>
            <Input.Search
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onSearch={searchPlaces}
                placeholder="جستجو کنید..."
                enterButton
            />

            {searchHistory.length > 0 && <List
                size="small"
                bordered
                dataSource={searchHistory}
                renderItem={(item) => (
                    <List.Item onClick={() => setSearchTerm(item)}>
                        <Button type="link">{item}</Button>
                    </List.Item>
                )}
                style={{ maxHeight: "200px", overflowY: "auto" }}
            />}

            {loading ? <Spin size="large" style={{ display: "block", margin: "20px auto" }} /> : null}

            <div style={{ height: "60vh", marginTop: "10px" }}>
                <NeshanMap
                    mapKey="web.2d47d9feb20c465391a510ebc1e4fd17"
                    defaultType="neshan"
                    center={userLocation ?? { latitude: 36.2951944, longitude: 59.5987236 }}
                    zoom={13}
                    onInit={onInit}
                    style={{ height: "100%" }}
                />

            </div>

            <Modal
                title={selectedPlace?.name}
                open={!!selectedPlace}
                onCancel={() => setSelectedPlace(null)}
                footer={null}
            >
                <p>مختصات: {selectedPlace?.latitude}, {selectedPlace?.longitude}</p>
            </Modal>
        </div>
    );
}

export default App;
