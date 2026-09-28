import React, { useRef, useEffect } from "react";
import "./Map.css";
import * as L from "./leaflet-src.esm";
import "./leaflet.css";

const Map = props => {
    const mapRef = useRef(null);

    const { center, zoom } = props;

    useEffect(() => {

        const map = L.map(mapRef.current, {
            center: center,
            zoom: zoom
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);
        const markerIcon = L.icon({
    iconUrl: '/images/marker-icon.png',
    iconRetinaUrl: '/images/marker-icon-2x.png',
    shadowUrl: '/images/marker-shadow.png',

    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

        L.marker(center, { icon: markerIcon }).addTo(map);

        return () => {
            map.remove();
        };

    }, [center, zoom]);

    return (
        <div
            ref={mapRef}
            className={`map ${props.className || ""}`}
            style={props.style}
        />
    );
};

export default Map;