import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, X, Loader2 } from 'lucide-react';

interface LocationSearchProps {
  onLocationSelect: (location: { latitude: number; longitude: number; address: string }) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

interface AutocompleteSuggestion {
  displayName: string;
  lat: number;
  lng: number;
}

export function LocationSearch({
  onLocationSelect,
  onClear,
  placeholder = 'Search for a location...',
  className = '',
}: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch suggestions with 300 ms debounce after 2+ characters
  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/geocode/autocomplete?q=${encodeURIComponent(query)}`
        );
        if (!res.ok) throw new Error('Autocomplete failed');
        const data: AutocompleteSuggestion[] = await res.json();
        setSuggestions(data);
        setShowDropdown(data.length > 0);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSelect = (suggestion: AutocompleteSuggestion) => {
    onLocationSelect({
      latitude: suggestion.lat,
      longitude: suggestion.lng,
      address: suggestion.displayName,
    });
    setQuery(suggestion.displayName);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    onClear?.();
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-8"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
        {!isLoading && query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-[10000] mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              // prevent the input blur from firing before the click registers
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-start gap-3 focus:outline-none focus:bg-gray-50"
            >
              <MapPin className="h-4 w-4 text-walkable-cyan mt-0.5 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900 line-clamp-1">
                {s.displayName}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
