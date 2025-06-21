import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Upload, Camera, Mic, Edit, Trash2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { InteractiveMap } from '@/components/interactive-map';
import { LocationSearch } from '@/components/location-search';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Types
interface TourDetails {
  title: string;
  description: string;
  category: string;
  coverImage: File | null;
  coverImagePreview: string;
}

interface TourStop {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  audioFile: File | null;
  audioFileName: string;
  order: number;
}

// Step Progress Component
function StepProgress({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, title: 'Tour Details', icon: MapPin },
    { number: 2, title: 'Add Stops', icon: Mic },
    { number: 3, title: 'Review', icon: Camera },
  ];

  return (
    <div className="flex items-center justify-between max-w-2xl mx-auto mb-8">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;
        const isConnected = index < steps.length - 1;

        return (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors
                ${isActive 
                  ? 'bg-walkable-cyan border-walkable-cyan text-white' 
                  : isCompleted 
                    ? 'bg-walkable-cyan border-walkable-cyan text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                }
              `}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`mt-2 text-sm font-medium ${
                isActive || isCompleted ? 'text-walkable-cyan' : 'text-gray-400'
              }`}>
                {step.title}
              </span>
            </div>
            {isConnected && (
              <div className={`h-0.5 w-24 mx-4 ${
                isCompleted ? 'bg-walkable-cyan' : 'bg-gray-300'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CreateTourNew() {
  const [currentStep, setCurrentStep] = useState(1);
  const [tourDetails, setTourDetails] = useState<TourDetails>({
    title: '',
    description: '',
    category: '',
    coverImage: null,
    coverImagePreview: '',
  });
  const [tourStops, setTourStops] = useState<TourStop[]>([]);
  const [currentStop, setCurrentStop] = useState<Partial<TourStop>>({
    title: '',
    description: '',
    latitude: 0,
    longitude: 0,
    audioFile: null,
    audioFileName: '',
  });
  const [selectedLocation, setSelectedLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number; address?: string} | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upload mutations
  const uploadCoverImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('coverImage', file);
      const response = await apiRequest('/api/upload/cover-image', {
        method: 'POST',
        body: formData,
      });
      return response.json();
    },
  });

  const uploadAudioMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('audio', file);
      const response = await apiRequest('/api/upload/audio', {
        method: 'POST',
        body: formData,
      });
      return response.json();
    },
  });

  const createTourMutation = useMutation({
    mutationFn: async (tourData: any) => {
      const response = await apiRequest('/api/tours', {
        method: 'POST',
        body: tourData,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
      toast({
        title: "Tour created successfully!",
        description: "Your tour is now live and ready for discovery.",
      });
      setLocation('/profile');
    },
    onError: (error: any) => {
      toast({
        title: "Error creating tour",
        description: error.message || "Failed to create tour. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Step 1: Tour Details
  const handleCoverImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTourDetails(prev => ({
          ...prev,
          coverImage: file,
          coverImagePreview: e.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep1 = () => {
    return tourDetails.title.trim() && 
           tourDetails.description.trim() && 
           tourDetails.category && 
           tourDetails.coverImage;
  };

  // Step 2: Add Stops
  const handleMapClick = (location: {latitude: number; longitude: number}) => {
    try {
      setSelectedLocation(location);
      setCurrentStop(prev => ({
        ...prev,
        latitude: location.latitude,
        longitude: location.longitude,
      }));
    } catch (error) {
      console.error('Error handling map click:', error);
    }
  };

  const handleLocationSearch = (location: {latitude: number; longitude: number; address: string}) => {
    try {
      setSelectedLocation(location);
      setCurrentStop(prev => ({
        ...prev,
        latitude: location.latitude,
        longitude: location.longitude,
      }));
      // Also set as active location to trigger map pan
      setUserLocation(location);
    } catch (error) {
      console.error('Error handling location search:', error);
    }
  };

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCurrentStop(prev => ({
        ...prev,
        audioFile: file,
        audioFileName: file.name,
      }));
    }
  };

  const addStop = () => {
    if (!currentStop.title || !selectedLocation || !currentStop.audioFile) return;

    const newStop: TourStop = {
      id: Date.now().toString(),
      title: currentStop.title,
      description: currentStop.description || '',
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      audioFile: currentStop.audioFile,
      audioFileName: currentStop.audioFileName,
      order: tourStops.length + 1,
    };

    setTourStops(prev => [...prev, newStop]);
    setCurrentStop({
      title: '',
      description: '',
      latitude: 0,
      longitude: 0,
      audioFile: null,
      audioFileName: '',
    });
    setSelectedLocation(null);
  };

  const moveStop = (index: number, direction: 'up' | 'down') => {
    const newStops = [...tourStops];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newStops.length) {
      [newStops[index], newStops[targetIndex]] = [newStops[targetIndex], newStops[index]];
      newStops.forEach((stop, idx) => {
        stop.order = idx + 1;
      });
      setTourStops(newStops);
    }
  };

  const deleteStop = (index: number) => {
    const newStops = tourStops.filter((_, idx) => idx !== index);
    newStops.forEach((stop, idx) => {
      stop.order = idx + 1;
    });
    setTourStops(newStops);
  };

  const handleGetUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: 'Your current location'
          };
          setUserLocation(location);
          toast({
            title: "Location found",
            description: "Map updated to your current location",
          });
        },
        (error) => {
          let message = "Unable to get your location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Location access denied. Please enable location services.";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Location information unavailable.";
              break;
            case error.TIMEOUT:
              message = "Location request timed out.";
              break;
          }
          toast({
            title: "Location error",
            description: message,
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    } else {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support location services",
        variant: "destructive",
      });
    }
  };

  const validateStep2 = () => {
    return tourStops.length > 0;
  };

  // Navigation
  const nextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep1 = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Let's create your audio tour</h1>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tour Title</label>
        <Input
          placeholder="e.g. Historic Downtown Walking Tour"
          value={tourDetails.title}
          onChange={(e) => setTourDetails(prev => ({ ...prev, title: e.target.value }))}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Short Description</label>
        <Textarea
          placeholder="Tell visitors what makes your tour special..."
          value={tourDetails.description}
          onChange={(e) => setTourDetails(prev => ({ ...prev, description: e.target.value }))}
          className="w-full h-24"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          {tourDetails.coverImagePreview ? (
            <div className="space-y-4">
              <img 
                src={tourDetails.coverImagePreview} 
                alt="Cover preview" 
                className="mx-auto max-h-48 rounded-lg"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('cover-upload')?.click()}
              >
                Change Image
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div>
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('cover-upload')?.click()}
                  className="text-walkable-cyan border-walkable-cyan hover:bg-walkable-cyan hover:text-white"
                >
                  Upload a file
                </Button>
                <span className="text-gray-500 ml-2">or drag and drop</span>
              </div>
              <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          )}
          <input
            id="cover-upload"
            type="file"
            accept="image/*"
            onChange={handleCoverImageUpload}
            className="hidden"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <Select value={tourDetails.category} onValueChange={(value) => setTourDetails(prev => ({ ...prev, category: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="history">History</SelectItem>
            <SelectItem value="culture">Culture</SelectItem>
            <SelectItem value="food">Food</SelectItem>
            <SelectItem value="nature">Nature</SelectItem>
            <SelectItem value="architecture">Architecture</SelectItem>
            <SelectItem value="art">Art</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={nextStep}
        disabled={!validateStep1()}
        className="w-full bg-walkable-cyan hover:bg-walkable-cyan-dark text-white py-3"
      >
        Continue
      </Button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Tour Stops</h1>
        <p className="text-gray-600">Create stops along your tour route. Each stop should have a title, location, and audio guide.</p>
      </div>

      {/* Map */}
      <div className="h-96 bg-gray-100 rounded-lg overflow-hidden">
        <InteractiveMap
          tours={[]}
          tourStops={tourStops}
          userLocation={userLocation}
          activeLocation={selectedLocation}
          selectedLocation={selectedLocation}
          onMapClick={handleMapClick}
          onLocationRequest={handleGetUserLocation}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location Search */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Search Location</h3>
          <LocationSearch
            onLocationSelect={handleLocationSearch}
            placeholder="Search for a place or address"
          />
          <p className="text-sm text-gray-500">Or click directly on the map to place a marker</p>
        </div>

        {/* Add New Stop Form */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Add New Stop</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stop Title</label>
            <Input
              placeholder="e.g. Historic Town Square"
              value={currentStop.title || ''}
              onChange={(e) => setCurrentStop(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Audio Guide</label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled
                className="text-gray-400"
              >
                <Mic className="h-4 w-4 mr-2" />
                Record Audio (Coming Soon)
              </Button>
              <Button
                variant="outline"
                onClick={() => document.getElementById('audio-upload')?.click()}
              >
                Upload Audio
              </Button>
            </div>
            {currentStop.audioFileName && (
              <p className="text-sm text-green-600 mt-2">✓ {currentStop.audioFileName}</p>
            )}
            <input
              id="audio-upload"
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
              onChange={handleAudioUpload}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <Textarea
              placeholder="Provide additional details about this stop..."
              value={currentStop.description || ''}
              onChange={(e) => setCurrentStop(prev => ({ ...prev, description: e.target.value }))}
              className="h-20"
            />
          </div>

          <Button
            onClick={addStop}
            disabled={!currentStop.title || !selectedLocation || !currentStop.audioFile}
            className="w-full bg-walkable-cyan hover:bg-walkable-cyan-dark text-white disabled:bg-gray-400"
          >
            Add This Stop
          </Button>
        </div>
      </div>

      {/* Tour Stops List */}
      {tourStops.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Tour Stops ({tourStops.length})</h3>
          <div className="space-y-2">
            {tourStops.map((stop, index) => (
              <Card key={stop.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-walkable-cyan text-white">
                      {index + 1}
                    </Badge>
                    <div>
                      <h4 className="font-medium">{stop.title}</h4>
                      <p className="text-sm text-gray-600">{stop.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveStop(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveStop(index, 'down')}
                      disabled={index === tourStops.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteStop(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={prevStep}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={nextStep}
          disabled={!validateStep2()}
          className="flex-1 bg-walkable-cyan hover:bg-walkable-cyan-dark text-white"
        >
          Continue to Review
        </Button>
      </div>
    </div>
  );

  const handleCreateTour = async () => {
    try {
      // Upload cover image first
      let coverImageUrl = '';
      if (tourDetails.coverImage) {
        const coverResult = await uploadCoverImageMutation.mutateAsync(tourDetails.coverImage);
        coverImageUrl = coverResult.imageUrl;
      }

      // Upload audio files for all stops
      const stopsWithAudio = await Promise.all(
        tourStops.map(async (stop) => {
          if (stop.audioFile) {
            const audioResult = await uploadAudioMutation.mutateAsync(stop.audioFile);
            return {
              title: stop.title,
              description: stop.description,
              latitude: stop.latitude.toString(),
              longitude: stop.longitude.toString(),
              audioFileUrl: audioResult.audioUrl,
              order: stop.order,
            };
          }
          return {
            title: stop.title,
            description: stop.description,
            latitude: stop.latitude.toString(),
            longitude: stop.longitude.toString(),
            audioFileUrl: '',
            order: stop.order,
          };
        })
      );

      // Create the complete tour data
      const tourData = {
        title: tourDetails.title,
        description: tourDetails.description,
        category: tourDetails.category,
        latitude: stopsWithAudio[0]?.latitude || '0',
        longitude: stopsWithAudio[0]?.longitude || '0',
        audioFileUrl: stopsWithAudio[0]?.audioFileUrl || '',
        duration: 60, // Default duration
        distance: '2.5', // Default distance
        coverImageUrl,
      };

      await createTourMutation.mutateAsync(tourData);
    } catch (error) {
      console.error('Error creating tour:', error);
      toast({
        title: "Error creating tour",
        description: "Failed to create tour. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderStep3 = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Your Tour</h1>
      </div>

      {/* Tour Details Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Tour Details</h3>
        <div className="space-y-4">
          <div>
            <span className="font-medium">Title:</span> {tourDetails.title}
          </div>
          <div>
            <span className="font-medium">Description:</span> {tourDetails.description}
          </div>
          <div>
            <span className="font-medium">Category:</span> {tourDetails.category}
          </div>
          {tourDetails.coverImagePreview && (
            <div>
              <span className="font-medium">Cover Image:</span>
              <img 
                src={tourDetails.coverImagePreview} 
                alt="Cover preview" 
                className="mt-2 h-32 rounded-lg"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Stops Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Tour Stops ({tourStops.length})</h3>
        <div className="space-y-3">
          {tourStops.map((stop, index) => (
            <div key={stop.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Badge variant="secondary" className="bg-walkable-cyan text-white">
                {index + 1}
              </Badge>
              <div className="flex-1">
                <h4 className="font-medium">{stop.title}</h4>
                {stop.description && (
                  <p className="text-sm text-gray-600">{stop.description}</p>
                )}
                <p className="text-xs text-gray-500">Audio: {stop.audioFileName}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={prevStep}
          className="flex-1"
          disabled={createTourMutation.isPending}
        >
          Back
        </Button>
        <Button
          onClick={handleCreateTour}
          disabled={createTourMutation.isPending}
          className="flex-1 bg-walkable-cyan hover:bg-walkable-cyan-dark text-white"
        >
          {createTourMutation.isPending ? 'Creating Tour...' : 'Create Tour'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-16 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <StepProgress currentStep={currentStep} />
          
          <div className="bg-white rounded-lg shadow-sm p-8">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}