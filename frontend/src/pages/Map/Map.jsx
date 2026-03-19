import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import RoomIcon from "@mui/icons-material/Room";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import MapboxNavigationAdapter from "../../adapters/navigation/MapboxNavigationAdapter";

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
  const navigationService = useMemo(
    () => new MapboxNavigationAdapter(MAPBOX_TOKEN),
    []
  );

  const [currentPosition, setCurrentPosition] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeGeoJson, setRouteGeoJson] = useState(null);

  const [viewState, setViewState] = useState({
    latitude: 28.6448,
    longitude: 77.216,
    zoom: 14,
  });

  const mapRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastRouteFetchRef = useRef(0);

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
      console.error("Invalid latitude/longitude");
      return;
    }

    const newDestination = { lat: parsedLat, lng: parsedLng };
    setDestination(newDestination);
    setRouteGeoJson(null);
  }

  useEffect(() => {
    watchIdRef.current = navigationService.watchCurrentPosition(
      (nextPos) => {
        setCurrentPosition(nextPos);
      },
      (error) => {
        console.error("GPS error:", error);
      }
    );

    return () => {
      navigationService.clearWatch(watchIdRef.current);
    };
  }, [navigationService]);

  useEffect(() => {
    if (
      destinationLat !== undefined &&
      destinationLng !== undefined &&
      destinationLat !== null &&
      destinationLng !== null
    ) {
      setDestinationByCoords(destinationLat, destinationLng);
    }
  }, [destinationLat, destinationLng]);

  useEffect(() => {
    if (!currentPosition || !destination) return;

    const now = Date.now();
    if (now - lastRouteFetchRef.current < 3000) return;
    lastRouteFetchRef.current = now;

    const fetchRoute = async () => {
      try {
        const route = await navigationService.getRoute(
          currentPosition,
          destination
        );
        setRouteGeoJson(route);

        if (mapRef.current) {
          navigationService.fitMapToPoints(
            mapRef.current,
            currentPosition,
            destination
          );
        }
      } catch (err) {
        console.error("getRoute error:", err);
      }
    };

    fetchRoute();
  }, [currentPosition, destination, navigationService]);

  function handleCenterCurrentLocation() {
    if (!mapRef.current || !currentPosition) return;
    navigationService.focusCurrentLocation(mapRef.current, currentPosition);
  }

  function handleFitCurrentAndDestination() {
    if (!mapRef.current || !currentPosition || !destination) return;
    navigationService.fitMapToPoints(
      mapRef.current,
      currentPosition,
      destination
    );
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
          }}
        >
          Center The Route
        </button>
      </div>

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