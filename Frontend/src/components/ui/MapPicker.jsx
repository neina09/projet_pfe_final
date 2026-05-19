import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Spinner from './Spinner';
import { useTranslation } from 'react-i18next';

// Fix for default marker icon in Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIconRetina,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({ position, setPosition, onAddressFound, setLoading }) {
    const map = useMap();

    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            setPosition([lat, lng]);
            map.flyTo(e.latlng, map.getZoom());
            
            setLoading(true);
            // Reverse geocoding
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar,fr,en`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.address) {
                        const a = data.address;
                        // Pick the most specific short name
                        const shortName = a.neighbourhood || a.suburb || a.city_district || a.town || a.city || a.village || data.display_name.split(',')[0];
                        onAddressFound(shortName, lat, lng);
                    } else if (data && data.display_name) {
                        onAddressFound(data.display_name.split(',')[0], lat, lng);
                    }
                })
                .catch(err => console.error('Geocoding error:', err))
                .finally(() => setLoading(false));
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

// Helper to center map if position changes from outside
function ChangeView({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

export default function MapPicker({ onLocationSelect, initialLat, initialLng }) {
    const { t } = useTranslation();
    const [position, setPosition] = useState([18.0735, -15.9582]); // Default to Nouakchott
    const [loading, setLoading] = useState(false);

    // Sync with initial props if provided
    useEffect(() => {
        if (initialLat && initialLng) {
            setPosition([initialLat, initialLng]);
        }
    }, [initialLat, initialLng]);

    // Try to get user's current location on mount if no initial position is provided
    useEffect(() => {
        if (!initialLat && !initialLng && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setPosition([pos.coords.latitude, pos.coords.longitude]);
            }, (err) => {
                console.warn("Geolocation denied or error:", err);
            });
        }
    }, [initialLat, initialLng]);

    const handleAddressFound = (address, lat, lng) => {
        onLocationSelect({ address, lat, lng });
    };

    return (
        <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border-2 border-primary-100 dark:border-primary-900/30 shadow-inner">
            <MapContainer 
                center={position} 
                zoom={13} 
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ChangeView center={position} />
                <LocationMarker 
                    position={position} 
                    setPosition={setPosition} 
                    onAddressFound={handleAddressFound} 
                    setLoading={setLoading}
                />
            </MapContainer>
            
            {loading && (
                <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg border border-primary-100">
                        <Spinner className="w-6 h-6 text-primary-600" />
                    </div>
                </div>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-primary-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 pointer-events-none whitespace-nowrap">
                <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                {t('map.clickPrompt')}
            </div>
        </div>
    );
}

