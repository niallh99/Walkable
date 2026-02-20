import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
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

type PriceFilter = 'all' | 'free' | 'paid';

function isTourFree(tour: Tour): boolean {
  return !tour.price || parseFloat(tour.price) === 0;
}

function formatTourPrice(tour: Tour): string {
  if (isTourFree(tour)) return 'Free';
  const symbol = tour.currency === 'GBP' ? '£' : tour.currency === 'USD' ? '$' : '€';
  return `${symbol}${parseFloat(tour.price).toFixed(2)}`;
}

export default function Discover() {
  const [userLocation, setUserLocation] = useState<UserLocation | undefined>();
  const [searchLocation, setSearchLocation] = useState<UserLocation | undefined>();
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

  // Display tours: nearby tours if we have location, otherwise all tours, then filter by price
  const baseTours = activeLocation ? nearbyTours : allTours;
  const displayTours = baseTours.filter((tour) => {
    if (priceFilter === 'free') return isTourFree(tour);
    if (priceFilter === 'paid') return !isTourFree(tour);
    return true;
  });

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
    setLocation(`/tour/${tour.id}`);
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
    
    // Generate stock photo URLs based on location/content
    let imageUrl = '';
    let altText = '';
    
    if (lowerTitle.includes('amsterdam') || lowerTitle.includes('canal')) {
      imageUrl = 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&h=300&fit=crop&crop=center';
      altText = 'Amsterdam Canals';
    } else if (lowerTitle.includes('san francisco') || lowerTitle.includes('downtown')) {
      imageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center';
      altText = 'San Francisco Downtown';
    } else if (lowerTitle.includes('golden gate') || lowerTitle.includes('bridge')) {
      imageUrl = 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop&crop=center';
      altText = 'Golden Gate Bridge';
    } else if (lowerTitle.includes('chinatown')) {
      imageUrl = 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center';
      altText = 'Chinatown';
    } else if (lowerTitle.includes('fisherman')) {
      imageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center';
      altText = 'Fishermans Wharf';
    } else if (lowerTitle.includes('beach') || lowerTitle.includes('boardwalk')) {
      imageUrl = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop&crop=center';
      altText = 'Beach';
    } else if (lowerTitle.includes('art') || lowerTitle.includes('gallery')) {
      imageUrl = 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center';
      altText = 'Art Gallery';
    } else if (lowerTitle.includes('park') || lowerTitle.includes('nature')) {
      imageUrl = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop&crop=center';
      altText = 'Park';
    } else if (lowerTitle.includes('food') || lowerTitle.includes('culinary')) {
      imageUrl = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop&crop=center';
      altText = 'Food Tour';
    } else if (lowerTitle.includes('historic') || lowerTitle.includes('history')) {
      imageUrl = 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop&crop=center';
      altText = 'Historic District';
    } else {
      // Default city image
      imageUrl = 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=300&fit=crop&crop=center';
      altText = 'City Tour';
    }

    return (
      <img 
        src={imageUrl} 
        alt={altText}
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `
              <div class="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                <div class="text-center text-white">
                  <div class="text-4xl mb-2">🏙️</div>
                  <div class="text-sm font-medium">${altText}</div>
                </div>
              </div>
            `;
          }
        }}
      />
    );
  };

  const handleLocationSearch = (location: { latitude: number; longitude: number; address: string }) => {
    setSearchLocation({ ...location });
    setUserLocation(undefined); // Clear user location when searching
  };

  const handleClearSearch = () => {
    setSearchLocation(undefined);
  };

  const handleShowNearbyTours = () => {
    const referenceLocation = activeLocation || userLocation;
    
    if (!referenceLocation || allTours.length === 0) {
      // Fallback to showing all tours if no location or no tours
      setUserLocation(undefined);
      setSearchLocation(undefined);
      return;
    }

    // Find the nearest tour to the reference location (user location or search location)
    let nearestTour = allTours[0];
    let shortestDistance = Infinity;

    allTours.forEach(tour => {
      const tourLat = parseFloat(tour.latitude);
      const tourLon = parseFloat(tour.longitude);
      
      // Calculate distance using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = (tourLat - referenceLocation.latitude) * Math.PI / 180;
      const dLon = (tourLon - referenceLocation.longitude) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(referenceLocation.latitude * Math.PI / 180) * Math.cos(tourLat * Math.PI / 180) * 
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

                {/* Price filter */}
                <div className="flex items-center border rounded-lg overflow-hidden">
                  {(['all', 'free', 'paid'] as PriceFilter[]).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setPriceFilter(filter)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        priceFilter === filter
                          ? 'bg-walkable-cyan text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {filter === 'all' ? 'All' : filter === 'free' ? 'Free' : 'Paid'}
                    </button>
                  ))}
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
                  {activeLocation && allTours.length > 0 && (
                    <Button
                      onClick={handleShowNearbyTours}
                      className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white"
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

                  <Button 
                    className="w-full bg-walkable-cyan hover:bg-walkable-cyan-dark text-white"
                    onClick={() => handleTourSelect(selectedTour)}
                  >
                    View Tour Details
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
                    {tour.coverImageUrl ? (
                      <img 
                        src={tour.coverImageUrl} 
                        alt={tour.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                                <div class="text-center text-white">
                                  <div class="text-4xl mb-2">🏙️</div>
                                  <div class="text-sm font-medium">${tour.title}</div>
                                </div>
                              </div>
                            `;
                          }
                        }}
                      />
                    ) : (
                      getLocationImage(tour.title)
                    )}
                  </div>
                  <div className="absolute top-3 left-3">
                    <Badge className={getCategoryColor(tour.category)}>
                      {tour.category}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                    {(tour as any).averageRating > 0 && (
                      <div className="bg-black/70 text-white px-2 py-1 rounded-md text-sm flex items-center">
                        <span className="text-yellow-400 mr-1">★</span>
                        {parseFloat((tour as any).averageRating).toFixed(1)}
                      </div>
                    )}
                    <Badge className={isTourFree(tour)
                      ? 'bg-green-500 text-white hover:bg-green-500'
                      : 'bg-amber-500 text-white hover:bg-amber-500'
                    }>
                      {formatTourPrice(tour)}
                    </Badge>
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
                    View Tour Details
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