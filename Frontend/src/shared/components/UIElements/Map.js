import React,{useRef , useEffect} from "react";
import "./Map.css"
import * as L from './leaflet-src.esm';
import './leaflet.css';

const Map = props => {

    const mapRef = useRef()

    const{center,zoom} = props
    useEffect(()=>{
        var map = L.map(mapRef.current, {
    center: center,
    zoom: zoom
        });
    L.marker(center).addTo(map);
    },[center,zoom])

    


    return <div ref={mapRef} className={`map ${props.className}`} style={props.style}></div>

}

export default Map