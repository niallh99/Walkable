import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { InteractiveMap } from '@/components/interactive-map';
import { LocationSearch } from '@/components/location-search';
import { Navbar } from '@/components/navbar';
import { Tour } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Volume2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export default function Discover() {
  const [userLocation, setUserLocation] = useState<UserLocation | undefined>();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [searchLocation, setSearchLocation] = useState<UserLocation | undefined>();
  const { toast } = useToast();

  // Fetch all tours initially
  const { data: allTours = [], isLoading: isLoadingTours } = useQuery<Tour[]>({
    queryKey: ['/api/tours'],
  });

  // Use the active location (search or user location)
  const activeLocation = searchLocation || userLocation;

  // Fetch nearby tours when any location is available
  const { data: nearbyTours = [], isLoading: isLoadingNearby } = useQuery<Tour[]>({
    queryKey: ['/api/tours/nearby', activeLocation?.latitude, activeLocation?.longitude],
    queryFn: async () => {
      if (!activeLocation) return [];
      const response = await fetch(
        `/api/tours/nearby?lat=${activeLocation.latitude}&lon=${activeLocation.longitude}&radius=10`
      );
      if (!response.ok) throw new Error('Failed to fetch nearby tours');
      return response.json();
    },
    enabled: !!activeLocation,
  });

  // Use nearby tours if location is available, otherwise show all tours
  const displayTours = activeLocation ? nearbyTours : allTours;

  const handleLocationRequest = async () => {
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(location);
        setIsGettingLocation(false);
        toast({
          title: "Location found",
          description: "Showing tours near your location.",
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsGettingLocation(false);
        toast({
          title: "Location access denied",
          description: "Please enable location access to find nearby tours.",
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  const handleTourSelect = (tour: Tour) => {
    setSelectedTour(tour);
  };

  const handleLocationSearch = (location: { latitude: number; longitude: number; address: string }) => {
    setSearchLocation({ ...location });
    setUserLocation(undefined); // Clear user location when searching
  };

  const handleClearSearch = () => {
    setSearchLocation(undefined);
  };

  const handleShowNearbyTours = () => {
    if (!userLocation || allTours.length === 0) {
      // Fallback to showing all tours if no user location or no tours
      setUserLocation(undefined);
      setSearchLocation(undefined);
      return;
    }

    // Find the nearest tour to user's location
    let nearestTour = allTours[0];
    let shortestDistance = Infinity;

    allTours.forEach(tour => {
      const tourLat = parseFloat(tour.latitude);
      const tourLon = parseFloat(tour.longitude);
      
      // Calculate distance using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = (tourLat - userLocation.latitude) * Math.PI / 180;
      const dLon = (tourLon - userLocation.longitude) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(tourLat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestTour = tour;
      }
    });

    // Set search location to the nearest tour's location
    const nearestLocation = {
      latitude: parseFloat(nearestTour.latitude),
      longitude: parseFloat(nearestTour.longitude),
    };
    
    setSearchLocation(nearestLocation);
    setUserLocation(undefined);
    
    toast({
      title: "Showing nearest tours",
      description: `Found tours near ${nearestTour.title}`,
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      history: 'bg-orange-100 text-orange-800',
      culture: 'bg-purple-100 text-purple-800',
      food: 'bg-red-100 text-red-800',
      nature: 'bg-green-100 text-green-800',
      architecture: 'bg-blue-100 text-blue-800',
    };
    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-16 h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Discover Tours</h1>
                  <p className="text-gray-600 mt-1">
                    {activeLocation 
                      ? `Showing tours near ${searchLocation?.address || 'your location'}` 
                      : `Explore ${displayTours.length} available tours`
                    }
                  </p>
                </div>
                
                {!activeLocation && (
                  <Button
                    onClick={handleLocationRequest}
                    disabled={isGettingLocation}
                    className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white"
                  >
                    {isGettingLocation ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Finding Location...
                      </>
                    ) : (
                      <>
                        <MapPin className="mr-2 h-4 w-4" />
                        Use My Location
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Location Search */}
              <div className="flex items-center space-x-4">
                <div className="flex-1 max-w-md">
                  <LocationSearch
                    onLocationSelect={handleLocationSearch}
                    onClear={handleClearSearch}
                    placeholder="Search for tours in a city or location..."
                    className="w-full"
                  />
                </div>
                
                {activeLocation && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchLocation(undefined);
                      setUserLocation(undefined);
                    }}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Show All Tours
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Map Section */}
          <div className="flex-1 relative">
            {isLoadingTours || isLoadingNearby ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-walkable-cyan mx-auto mb-4" />
                  <p className="text-gray-600">Loading tours...</p>
                </div>
              </div>
            ) : displayTours.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center max-w-md mx-auto px-4">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tours Found</h3>
                  <p className="text-gray-600 mb-4">
                    {userLocation 
                      ? "No tours found in your area. Try expanding your search radius or explore other locations."
                      : "No tours are currently available. Check back later for new content."
                    }
                  </p>
                  {userLocation && (
                    <Button
                      onClick={handleShowNearbyTours}
                      variant="outline"
                      className="border-walkable-cyan text-walkable-cyan hover:bg-walkable-cyan hover:text-white"
                    >
                      Show Nearby Tours
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <InteractiveMap
                tours={displayTours}
                userLocation={userLocation}
                activeLocation={activeLocation}
                onLocationRequest={handleLocationRequest}
                onTourSelect={handleTourSelect}
              />
            )}
          </div>

          {/* Tour Details Sidebar */}
          {selectedTour && (
            <div className="w-96 bg-white border-l border-gray-200 p-6 overflow-y-auto">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{selectedTour.title}</CardTitle>
                      <Badge className={getCategoryColor(selectedTour.category)}>
                        {selectedTour.category}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTour(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <CardDescription className="text-base leading-relaxed">
                    {selectedTour.description}
                  </CardDescription>

                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    {selectedTour.duration && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{selectedTour.duration} min</span>
                      </div>
                    )}
                    {selectedTour.distance && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{selectedTour.distance}</span>
                      </div>
                    )}
                  </div>

                  {selectedTour.audioFileUrl && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center space-x-2 mb-2">
                        <Volume2 className="h-4 w-4 text-walkable-cyan" />
                        <span className="font-medium text-sm">Audio Preview</span>
                      </div>
                      <audio 
                        controls 
                        className="w-full"
                        src={selectedTour.audioFileUrl}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}

                  <div className="pt-4 space-y-3">
                    <Button className="w-full bg-walkable-cyan hover:bg-walkable-cyan-dark text-white">
                      Start Tour
                    </Button>
                    <Button variant="outline" className="w-full">
                      Save for Later
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
