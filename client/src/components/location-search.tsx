import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocationSearchProps {
  onLocationSelect: (location: { latitude: number; longitude: number; address: string }) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

interface GeocodeResult {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export function LocationSearch({ onLocationSelect, onClear, placeholder = "Search for a location...", className = "" }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const searchLocation = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/geocode?address=${encodeURIComponent(searchQuery)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to search location');
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        setSuggestions(data.results.slice(0, 5)); // Show top 5 results
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        toast({
          title: "No results found",
          description: "Try searching with a different location name.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({
        title: "Search failed",
        description: "Unable to search for locations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = () => {
    searchLocation(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSuggestionSelect = (result: GeocodeResult) => {
    const location = {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      address: result.formatted_address,
    };
    
    onLocationSelect(location);
    setQuery(result.formatted_address);
    setShowSuggestions(false);
    
    toast({
      title: "Location selected",
      description: `Showing tours near ${result.formatted_address}`,
    });
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onClear?.();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={inputRef}>
      <div className="flex space-x-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pr-10"
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((result, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionSelect(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50"
            >
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-walkable-cyan mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                    {result.formatted_address}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}