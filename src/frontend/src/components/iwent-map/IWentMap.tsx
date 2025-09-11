import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import "./IWentMap.css";



interface ApiResponse {
  data: Venue[];
  total: number;
  page: number;
  limit: number;
}

interface Venue {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  city?: string | null;
  banner?: string | null;
  capacity?: number | null;
  seatedCapacity?: number | null;
  standingCapacity?: number | null;
  socialMedia: Record<string, any>; // defaults to {}
  organizerId?: string | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  details?: string;
  accessibility?: string;
  mapsLocation?: string;
  latitude?: number;
  longitude?: number;
  approved: boolean;
  favoriteCount: number;
  following: boolean;
  deletedAt?: string | null;
  events: string[]; // array of event ids
}

interface IWentMapProps {
  venueId?: string;
}

// ✅ Fix default marker icon issue
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import axios from "axios";
import { toast } from "react-toastify";
import VenuesEventList from "pages/venues/VenuesEventList";
import VenueMarkerEventList from "./VenueMarkerEventList";
import { Link } from "react-router-dom";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

import defaultIcon from '../../assets/map/default-icon.png';
import defaultIconActive from '../../assets/map/default-icon-active.png';
import venueIcon from '../../assets/map/venue-icon.png';
import venueIconActive from '../../assets/map/venue-icon-active.png';

const DefaultMapIcon = L.icon({
    iconUrl: defaultIcon,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
});

const DefaultMapIconActive = L.icon({
    iconUrl: defaultIconActive,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
});

const VenueMapIcon = L.icon({
    iconUrl: venueIcon,
    iconSize: [32, 44],
    iconAnchor: [16, 32],
});

const VenueMapIconActive = L.icon({
    iconUrl: venueIconActive,
    iconSize: [32, 32],
    iconAnchor: [16, 32],

});

L.Marker.prototype.options.icon = DefaultIcon;

const IWentMap = ({ venueId }: IWentMapProps) => {
    const defaultPosition: [number, number] = [41.0082, 28.9784]; // Istanbul
    const [userPosition, setUserPosition] = useState<[number, number]>([0, 0]);
    const [dbVenues, setDbVenues] = useState<Venue[]>([]);
    const [filters, setFilters] = useState({});
    const [currentZoom, setCurrentZoom] = useState(13); // Initial zoom level

    // Custom hook to get map events
    function MapEvents() {
        useMapEvents({
            zoomend: (e) => {
                setCurrentZoom(e.target.getZoom());
            },
        });
        return null;
    }

    const fetchVenues = async () => {
        const response = await axios.get<ApiResponse>(`${process.env.REACT_APP_API_URL}/venues?limit=100`);
        const venuesFormatted: Venue[] = response.data.data.map(v => ({
        ...v,
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
        }));
        setDbVenues(venuesFormatted);
    };

    useEffect(() => {
        fetchVenues();

        if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
            () => {}
        );
        }
    }, []);

    const venueCenter = venueId
        ? dbVenues.find(v => v.id === venueId)
        : null;

    if (venueId && !venueCenter) {
        // venue not loaded yet, don't render the map
        return null; 
    }

    const center: [number, number] = venueCenter
        ? [venueCenter.latitude as number, venueCenter.longitude as number]
        : userPosition[0] !== 0
        ? userPosition
        : defaultPosition;

  return (
    <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100vh", width: "100%" }}
    >
        <MapEvents />

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="dark-mode-tiles"/>
    {/* user location */}
    {userPosition[0] !== 0 && userPosition[1] !== 0 && (
        <Marker position={userPosition as any}>
            <Popup>You are here</Popup>
        </Marker>
    )}

    {/* venues */}
    {currentZoom >= 5 && ( // Only show markers if zoom level is 10 or higher
        dbVenues
        .filter(v => typeof v.latitude === "number" && typeof v.longitude === "number")
        .map(venue => (
            <Marker 
            key={venue.id} 
            position={[venue.latitude as number, venue.longitude as number] as LatLngExpression} 
            icon={VenueMapIcon}
            >
            <Popup>
                {venue.banner && (
                    <img
                    src={venue.banner}
                    alt={venue.name}
                    className="venue-popup-banner"
                    onClick={() => window.location.href = `/venues/${venue.slug}`}
                    />
                )}
                <Link
                    to={`/venues/${venue.slug}`}
                    className="venue-popup-name"
                >
                    {venue.name}
                </Link>
                {venue.city && <div>{venue.city}</div>}
                <VenueMarkerEventList eventIds={venue.events} />
            </Popup>
            </Marker>
        ))
    )}

    </MapContainer>
  );
};

export default IWentMap;
