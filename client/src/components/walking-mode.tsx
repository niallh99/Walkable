import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { X, SkipBack, SkipForward, Play, Pause, MapPin, Navigation } from 'lucide-react';
import type { TourStop } from '@shared/schema';

// Numbered stop icon
const createNumberedIcon = (number: number, isActive: boolean) => {
  const bg = isActive ? '#f59e0b' : '#00BCD4';
  return L.divIcon({
    html: `<div style="background-color: ${bg}; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); font-size: 14px;">${number}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Haversine distance in meters
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Sub-component to keep map centered on user
function MapCenterer({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);
  return null;
}

interface WalkingModeProps {
  stops: TourStop[];
  tourTitle: string;
  onClose: () => void;
}

export function WalkingMode({ stops, tourTitle, onClose }: WalkingModeProps) {
  const sortedStops = [...stops].sort((a, b) => a.order - b.order);

  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStop = sortedStops[currentStopIndex];
  const isLastStop = currentStopIndex === sortedStops.length - 1;

  // Compute distance to current stop
  const distToStop = userPosition && currentStop
    ? distanceMeters(
        userPosition[0], userPosition[1],
        parseFloat(currentStop.latitude), parseFloat(currentStop.longitude)
      )
    : null;

  // Route polyline from all stops
  const routePositions: [number, number][] = sortedStops.map((s) => [
    parseFloat(s.latitude),
    parseFloat(s.longitude),
  ]);

  // Start GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPosition([pos.coords.latitude, pos.coords.longitude]);
        setGeoError(null);
      },
      (err) => {
        setGeoError(err.code === 1 ? 'Location access denied.' : 'Unable to get location.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  // Handle audio end → start countdown → advance
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    if (isLastStop) return;

    // Start 3-second countdown
    setCountdown(3);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          // Advance to next stop
          setCurrentStopIndex((i) => Math.min(i + 1, sortedStops.length - 1));
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isLastStop, sortedStops.length]);

  // Auto-play audio when stop changes
  useEffect(() => {
    const stop = sortedStops[currentStopIndex];
    const audioUrl = stop?.audioFileUrl;

    // Clean up previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener('ended', handleAudioEnded);
      audioRef.current.src = '';
    }

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.addEventListener('ended', handleAudioEnded);
      audioRef.current = audio;
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, [currentStopIndex, sortedStops, handleAudioEnded]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const skipPrev = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
    setCurrentStopIndex((i) => Math.max(i - 1, 0));
  };

  const skipNext = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
    setCurrentStopIndex((i) => Math.min(i + 1, sortedStops.length - 1));
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    onClose();
  };

  // Map center: user position or current stop
  const mapCenter: [number, number] = userPosition || [
    parseFloat(currentStop.latitude),
    parseFloat(currentStop.longitude),
  ];

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="bg-gray-900/95 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-medium text-gray-400 truncate">{tourTitle}</h2>
          <p className="text-lg font-bold truncate">
            Stop {currentStopIndex + 1}/{sortedStops.length}: {currentStop.title}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 ml-2 flex-shrink-0"
          onClick={handleClose}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Map area */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapCenterer position={userPosition} />

          {/* Route line */}
          {routePositions.length > 1 && (
            <Polyline positions={routePositions} color="#00BCD4" weight={4} opacity={0.6} dashArray="8 8" />
          )}

          {/* Stop markers */}
          {sortedStops.map((stop, idx) => (
            <Marker
              key={stop.id}
              position={[parseFloat(stop.latitude), parseFloat(stop.longitude)]}
              icon={createNumberedIcon(idx + 1, idx === currentStopIndex)}
            />
          ))}

          {/* User blue dot */}
          {userPosition && (
            <CircleMarker
              center={userPosition}
              radius={10}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 3 }}
            />
          )}
        </MapContainer>

        {/* Distance overlay */}
        <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur rounded-lg shadow-lg px-4 py-3">
          {geoError ? (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <MapPin className="h-4 w-4" />
              <span>{geoError}</span>
            </div>
          ) : distToStop !== null ? (
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-walkable-cyan" />
              <div>
                <p className="text-xs text-gray-500">Distance to next stop</p>
                <p className="text-xl font-bold text-gray-900">
                  {distToStop < 1000
                    ? `${Math.round(distToStop)}m`
                    : `${(distToStop / 1000).toFixed(1)}km`}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Navigation className="h-4 w-4 animate-pulse" />
              <span>Getting location...</span>
            </div>
          )}
        </div>

        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-[1001] bg-black/70 flex items-center justify-center">
            <div className="text-center text-white">
              <p className="text-lg font-medium mb-2">Next stop in</p>
              <div className="text-8xl font-bold tabular-nums">{countdown}</div>
              <p className="text-lg mt-4 text-gray-300">
                {sortedStops[currentStopIndex + 1]?.title}
              </p>
              <Button
                variant="outline"
                className="mt-6 border-white text-white hover:bg-white/20"
                onClick={skipNext}
              >
                Skip now
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom audio controls */}
      <div className="bg-gray-900/95 text-white px-4 py-4 flex-shrink-0">
        {/* Stop description */}
        {currentStop.description && (
          <p className="text-sm text-gray-400 mb-3 line-clamp-2 text-center">
            {currentStop.description}
          </p>
        )}

        {/* Player controls */}
        <div className="flex items-center justify-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 h-12 w-12"
            onClick={skipPrev}
            disabled={currentStopIndex === 0}
          >
            <SkipBack className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 h-16 w-16 rounded-full border-2 border-white/30"
            onClick={togglePlay}
            disabled={!currentStop.audioFileUrl}
          >
            {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 h-12 w-12"
            onClick={skipNext}
            disabled={isLastStop}
          >
            <SkipForward className="h-6 w-6" />
          </Button>
        </div>

        {/* Stop progress dots */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {sortedStops.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStopIndex
                  ? 'w-6 bg-walkable-cyan'
                  : idx < currentStopIndex
                    ? 'w-1.5 bg-white/60'
                    : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
