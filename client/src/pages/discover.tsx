import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { InteractiveMap } from '@/components/interactive-map';
import { LocationSearch } from '@/components/location-search';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
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
  const [searchLocation, setSearchLocation] = useState<UserLocation | undefined>();
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { toast } = useToast();

  // Active location is either search location or user location
  const activeLocation = searchLocation || userLocation;

  // Fetch all tours
  const { data: allTours = [], isLoading: isLoadingTours } = useQuery<Tour[]>({
    queryKey: ['/api/tours'],
  });

  // Fetch nearby tours when we have an active location
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

  // Display tours: nearby tours if we have location, otherwise all tours
  const displayTours = activeLocation ? nearbyTours : allTours;

  const handleLocationRequest = () => {
    if (isGettingLocation) return;
    
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(location);
        setSearchLocation(undefined); // Clear search when using current location
        setIsGettingLocation(false);
        
        toast({
          title: "Location found",
          description: "Showing tours near your current location",
        });
      },
      (error) => {
        setIsGettingLocation(false);
        console.error('Error getting location:', error);
        
        toast({
          title: "Location unavailable",
          description: "Please search for a location or try again",
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

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      history: 'bg-orange-100 text-orange-800',
      culture: 'bg-purple-100 text-purple-800',
      food: 'bg-red-100 text-red-800',
      nature: 'bg-green-100 text-green-800',
      architecture: 'bg-blue-100 text-blue-800',
      art: 'bg-pink-100 text-pink-800',
    };
    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getLocationImage = (title: string) => {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('amsterdam') || lowerTitle.includes('canal')) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-4xl mb-2">🏛️</div>
            <div className="text-sm font-medium">Amsterdam Canals</div>
          </div>
        </div>
      );
    }
    
    if (lowerTitle.includes('san francisco') || lowerTitle.includes('downtown')) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-4xl mb-2">🌁</div>
            <div className="text-sm font-medium">San Francisco</div>
          </div>
        </div>
      );
    }

    if (lowerTitle.includes('golden gate') || lowerTitle.includes('bridge')) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-4xl mb-2">🌉</div>
            <div className="text-sm font-medium">Golden Gate</div>
          </div>
        </div>
      );
    }

    if (lowerTitle.includes('chinatown')) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-red-600 to-yellow-500 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-4xl mb-2">🏮</div>
            <div className="text-sm font-medium">Chinatown</div>
          </div>
        </div>
      );
    }

    if (lowerTitle.includes('art') || lowerTitle.includes('gallery')) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-4xl mb-2">🎨</div>
            <div className="text-sm font-medium">Art District</div>
          </div>
        </div>
      );
    }

    // Default city image
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-4xl mb-2">🏙️</div>
          <div className="text-sm font-medium">City Tour</div>
        </div>
      </div>
    );
  };

  const handleLocationSearch = (location: { latitude: number; longitude: number; address: string }) => {
    setSearchLocation({ ...location });
    setUserLocation(undefined); // Clear user location when searching
  };

  const handleClearSearch = () => {
    setSearchLocation(undefined);
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
              
              <div className="flex items-center space-x-4">
                <div className="flex-1 max-w-md">
                  <LocationSearch
                    onLocationSelect={handleLocationSearch}
                    onClear={searchLocation ? handleClearSearch : undefined}
                    placeholder="Search for a location..."
                  />
                </div>
                
                {activeLocation && (
                  <Button
                    variant="outline"
                    onClick={handleClearSearch}
                    className="border-walkable-cyan text-walkable-cyan hover:bg-walkable-cyan hover:text-white"
                  >
                    Show All Tours
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Map and Tours */}
        <div className="flex-1 flex">
          {/* Map */}
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
                    {activeLocation 
                      ? "No tours found in your area. Try expanding your search radius or explore other locations."
                      : "No tours are currently available. Check back later for new content."
                    }
                  </p>
                  {activeLocation && (
                    <Button
                      onClick={handleClearSearch}
                      className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white"
                    >
                      Show All Tours
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
                <CardContent>
                  <CardDescription className="text-sm text-gray-600 mb-4">
                    {selectedTour.description}
                  </CardDescription>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2 text-walkable-cyan" />
                      <span>{selectedTour.duration || 60} minutes</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 text-walkable-cyan" />
                      <span>{selectedTour.distance || 2.5} km walking distance</span>
                    </div>
                    {selectedTour.audioFileUrl && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Volume2 className="h-4 w-4 mr-2 text-walkable-cyan" />
                        <span>Audio guide included</span>
                      </div>
                    )}
                  </div>

                  <Button className="w-full bg-walkable-cyan hover:bg-walkable-cyan-dark text-white">
                    Start Tour
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Tours Grid Section */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {displayTours.length} tours found
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayTours.map((tour) => (
              <Card key={tour.id} className="group cursor-pointer hover:shadow-lg transition-shadow">
                <div className="relative">
                  <div className="aspect-[4/3] bg-gradient-to-br from-gray-300 to-gray-500 rounded-t-lg flex items-center justify-center overflow-hidden">
                    {getLocationImage(tour.title)}
                  </div>
                  <div className="absolute top-3 left-3">
                    <Badge className={getCategoryColor(tour.category)}>
                      {tour.category}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded-md text-sm flex items-center">
                    <span className="text-yellow-400 mr-1">★</span>
                    4.5
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-1">
                    {tour.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {tour.description}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{tour.duration || 60} min</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{tour.distance || 2.5} km</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-walkable-cyan hover:bg-walkable-cyan-dark text-white"
                    onClick={() => handleTourSelect(tour)}
                  >
                    Start Tour
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}