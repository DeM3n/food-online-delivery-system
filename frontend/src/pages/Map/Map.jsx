import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import RoomIcon from "@mui/icons-material/Room";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZ2lhYmFvMTIzOTYzIiwiYSI6ImNtbXd2bzhkYzJtYmMyc3MydnJmYnFpcTgifQ.NCmNGZo6WCbAEImHLdq1ZQ";

const routeLayerStyle = {
  id: "route",
  type: "line",
  paint: {
    "line-color": "#3b82f6",
    "line-width": 5,
  },
};

export default function AppMap({ destinationLat, destinationLng }) {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeGeoJson, setRouteGeoJson] = useState(null);

  const [destLat, setDestLat] = useState("");
  const [destLng, setDestLng] = useState("");

  const [viewState, setViewState] = useState({
    latitude: 28.6448,
    longitude: 77.216,
    zoom: 14,
  });

  const mapRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastRouteFetchRef = useRef(0);

  async function getRoute(start, end) {
    if (!MAPBOX_TOKEN) {
      console.error("Missing MAPBOX_TOKEN");
      return;
    }

    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/` +
      `${start.lng},${start.lat};${end.lng},${end.lat}` +
      `?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

    try {
      const res = await fetch(url);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Directions API failed: ${res.status} - ${text}`);
      }

      const data = await res.json();

      if (data.routes?.length) {
        setRouteGeoJson({
          type: "Feature",
          properties: {
            distance: data.routes[0].distance,
            duration: data.routes[0].duration,
          },
          geometry: data.routes[0].geometry,
        });
      }
    } catch (err) {
      console.error("getRoute error:", err);
    }
  }

  function fitMapToPoints(start, end) {
    if (!mapRef.current || !start || !end) return;

    const west = Math.min(start.lng, end.lng);
    const south = Math.min(start.lat, end.lat);
    const east = Math.max(start.lng, end.lng);
    const north = Math.max(start.lat, end.lat);

    mapRef.current.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        duration: 1000,
        maxZoom: 16,
      }
    );
  }

  function setDestinationByCoords(lat, lng) {
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    if (
      Number.isNaN(parsedLat) ||
      Number.isNaN(parsedLng) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      console.error("Vĩ độ hoặc kinh độ không hợp lệ");
      return;
    }

    const newDestination = {
      lat: parsedLat,
      lng: parsedLng,
    };

    setDestination(newDestination);
    setRouteGeoJson(null);

    setViewState((prev) => ({
      ...prev,
      latitude: parsedLat,
      longitude: parsedLng,
      zoom: 15,
    }));

    if (currentPosition) {
      fitMapToPoints(currentPosition, newDestination);
    }
  }

  function handleSubmitDestination() {
    setDestinationByCoords(destLat, destLng);
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const nextPos = {
          lng: position.coords.longitude,
          lat: position.coords.latitude,
        };

        setCurrentPosition(nextPos);
      },
      (error) => {
        console.error("GPS error:", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      destinationLat !== undefined &&
      destinationLng !== undefined &&
      destinationLat !== null &&
      destinationLng !== null
    ) {
      setDestinationByCoords(destinationLat, destinationLng);
      setDestLat(String(destinationLat));
      setDestLng(String(destinationLng));
    }
  }, [destinationLat, destinationLng]);

  useEffect(() => {
    if (!currentPosition || !destination) return;

    const now = Date.now();
    if (now - lastRouteFetchRef.current < 3000) return;
    lastRouteFetchRef.current = now;

    getRoute(currentPosition, destination);
    fitMapToPoints(currentPosition, destination);
  }, [currentPosition, destination]);

  function handleCenterCurrentLocation() {
    if (!mapRef.current || !currentPosition) return;

    mapRef.current.flyTo({
        center: [currentPosition.lng, currentPosition.lat],
        zoom: 16,
        duration: 1000,
    });
    }

    function handleFitCurrentAndDestination() {
    if (!currentPosition || !destination) return;
    fitMapToPoints(currentPosition, destination);
    }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
        <div
            style={{
                position: "absolute",
                right: 16,
                bottom: 16,
                zIndex: 20,
                display: "flex",
                flexDirection: "column",
                gap: 10,
            }}
            >
            <button
                onClick={handleCenterCurrentLocation}
                style={{
                padding: "10px 14px",
                border: "none",
                borderRadius: 12,
                background: "#111827",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}
            >
                Focus My Location
            </button>

            <button
                onClick={handleFitCurrentAndDestination}
                style={{
                padding: "10px 14px",
                border: "none",
                borderRadius: 12,
                background: "#2563eb",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}
            >
                Center The Route
            </button>
            </div>
      {/* <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 10,
          background: "#fff",
          padding: 12,
          borderRadius: 10,
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="number"
          step="any"
          placeholder="Latitude"
          value={destLat}
          onChange={(e) => setDestLat(e.target.value)}
          style={{ padding: 8, width: 140 }}
        />
        <input
          type="number"
          step="any"
          placeholder="Longitude"
          value={destLng}
          onChange={(e) => setDestLng(e.target.value)}
          style={{ padding: 8, width: 140 }}
        />
        <button
          onClick={handleSubmitDestination}
          style={{
            padding: "8px 12px",
            border: "none",
            borderRadius: 8,
            background: "#2563eb",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Find the location
        </button>
      </div> */}

      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/giabao123963/cmmww1vdo000h01qwduq52tpu"
        style={{ width: "100%", height: "100%" }}
      >
        {currentPosition && (
          <Marker
            longitude={currentPosition.lng}
            latitude={currentPosition.lat}
            anchor="center"
          >
            <TwoWheelerIcon
              sx={{
                fontSize: 40,
                color: "#ff7300",
                filter: "drop-shadow(0 0 4px rgba(0,0,0,0.35))",
              }}
            />
          </Marker>
        )}

        {destination && (
          <Marker
            longitude={destination.lng}
            latitude={destination.lat}
            anchor="bottom"
          >
            <RoomIcon
              sx={{
                fontSize: 35,
                color: "red",
                filter: "drop-shadow(0 0 4px rgba(0,0,0,0.35))",
              }}
            />
          </Marker>
        )}

        {routeGeoJson && (
          <Source id="route-source" type="geojson" data={routeGeoJson}>
            <Layer {...routeLayerStyle} />
          </Source>
        )}
      </Map>
    </div>
  );
}