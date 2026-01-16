import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/auth-context';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { LocationSearch } from '@/components/location-search';
import { InteractiveMap } from '@/components/interactive-map';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, MapPin, Upload, FileAudio, Clock, Route } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const tourSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be less than 500 characters"),
  category: z.string().min(1, "Please select a category"),
  latitude: z.string().min(1, "Please select a location on the map"),
  longitude: z.string().min(1, "Please select a location on the map"),
  duration: z.number().min(1, "Duration must be at least 1 minute").max(300, "Duration cannot exceed 5 hours"),
  distance: z.string().min(1, "Please enter the walking distance"),
  audioFileUrl: z.string().optional(),
});

type TourFormData = z.infer<typeof tourSchema>;

interface UserLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

const CATEGORIES = [
  { value: 'history', label: 'History' },
  { value: 'culture', label: 'Culture' },
  { value: 'food', label: 'Food & Dining' },
  { value: 'nature', label: 'Nature & Parks' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'art', label: 'Art & Museums' },
  { value: 'entertainment', label: 'Entertainment' },
];

export default function CreateTour() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedLocation, setSelectedLocation] = useState<UserLocation | undefined>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TourFormData>({
    resolver: zodResolver(tourSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      latitude: '',
      longitude: '',
      duration: 60,
      distance: '',
      audioFileUrl: '',
    },
  });

  const uploadAudioMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('audio', file);
      
      const response = await fetch('/api/tours/upload-audio', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || 'Failed to upload audio file');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      form.setValue('audioFileUrl', data.audioUrl);
      toast({
        title: "Audio uploaded successfully!",
        description: `File "${data.originalName}" has been uploaded.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error uploading audio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createTourMutation = useMutation({
    mutationFn: async (data: TourFormData) => {
      return await apiRequest('POST', '/api/tours', data);
    },
    onSuccess: () => {
      toast({
        title: "🎉 Tour Created Successfully!",
        description: "Your audio walking tour has been published and is now available for discovery.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
      
      // Show success dialog with options
      setTimeout(() => {
        const createAnother = confirm(
          "Your tour has been created successfully!\n\nWould you like to create another tour?"
        );
        
        if (createAnother) {
          // Reset form and stay on create page
          form.reset();
          setCurrentStep(1);
          setSelectedLocation(undefined);
          setSelectedFile(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          // Go to discover page to see the tour
          setLocation('/discover');
        }
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create tour",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLocationSelect = (location: { latitude: number; longitude: number; address: string }) => {
    setSelectedLocation(location);
    form.setValue('latitude', location.latitude.toString());
    form.setValue('longitude', location.longitude.toString());
  };

  const handleMapClick = (location: UserLocation) => {
    setSelectedLocation(location);
    form.setValue('latitude', location.latitude.toString());
    form.setValue('longitude', location.longitude.toString());
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/ogg'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select an audio file (MP3, WAV, M4A, or OGG)",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Audio file must be less than 50MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      uploadAudioMutation.mutate(file);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const onSubmit = (data: TourFormData) => {
    console.log('Form submitted with data:', data);
    createTourMutation.mutate(data);
  };

  const handleCreateTour = () => {
    const formData = form.getValues();
    const errors = form.formState.errors;
    
    console.log('Form validation errors:', errors);
    console.log('Form data before submit:', formData);
    
    // Check for validation errors and show user-friendly messages
    if (Object.keys(errors).length > 0) {
      const errorMessages = Object.entries(errors).map(([field, error]) => {
        return `${field}: ${error?.message}`;
      }).join('\n');
      
      toast({
        title: "Please fix the following errors:",
        description: errorMessages,
        variant: "destructive",
      });
      return;
    }
    
    // Trigger form submission
    form.handleSubmit(onSubmit)();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-walkable-light-gray">
        <Navbar />
        <div className="pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔒</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Authentication Required
                  </h3>
                  <p className="text-walkable-gray max-w-md mx-auto mb-6">
                    Please log in to create and share your own audio walking tours.
                  </p>
                  <div className="space-x-4">
                    <Link href="/login">
                      <Button className="bg-walkable-cyan hover:bg-walkable-cyan text-white">
                        Login
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button variant="outline" className="border-walkable-cyan text-walkable-cyan">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tour Details</h2>
              <p className="text-walkable-gray">Tell us about your walking tour</p>
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tour Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Historic Downtown Walking Tour" {...field} />
                  </FormControl>
                  <FormDescription>
                    Give your tour a compelling, descriptive title
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Discover the rich history and hidden stories of downtown..."
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Describe what visitors will experience on your tour
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the category that best describes your tour
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="60"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Estimated walking time
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="distance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distance</FormLabel>
                    <FormControl>
                      <Input placeholder="2.3 miles" {...field} />
                    </FormControl>
                    <FormDescription>
                      Total walking distance
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tour Location</h2>
              <p className="text-walkable-gray">Pin your tour's starting location on the map</p>
            </div>

            <div className="space-y-4">
              <LocationSearch
                onLocationSelect={handleLocationSelect}
                placeholder="Search for your tour's starting location..."
              />
              
              {selectedLocation && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Location Selected: {selectedLocation.address || `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
              <InteractiveMap
                tours={[]}
                activeLocation={selectedLocation}
                onLocationRequest={() => {}}
                onMapClick={handleMapClick}
              />
            </div>

            <p className="text-sm text-walkable-gray text-center">
              Click on the map or use the search box above to set your tour's starting location
            </p>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Audio Content</h2>
              <p className="text-walkable-gray">Add audio narration to bring your tour to life</p>
            </div>

            <div className="space-y-4">
              <FormLabel>Audio File</FormLabel>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-walkable-cyan transition-colors">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="audio-upload"
                />
                <label htmlFor="audio-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center space-y-4">
                    <Upload className="h-12 w-12 text-gray-400" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        {selectedFile ? selectedFile.name : 'Upload Audio File'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Click to browse or drag and drop
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        MP3, WAV, M4A, OGG (max 50MB)
                      </p>
                    </div>
                  </div>
                </label>
              </div>
              
              {uploadAudioMutation.isPending && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-walkable-cyan"></div>
                    <span className="text-sm text-blue-800">Uploading audio file...</span>
                  </div>
                </div>
              )}
              
              {form.watch('audioFileUrl') && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <FileAudio className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-green-800">Audio file uploaded successfully!</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <FileAudio className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-2">Audio Guidelines</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Use MP3 format for best compatibility</li>
                    <li>• Keep file size under 50MB for faster loading</li>
                    <li>• Record in a quiet environment with clear narration</li>
                    <li>• Audio content should match the estimated duration</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-medium text-gray-900 mb-3">Tour Preview</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Title:</span> {form.watch('title') || 'Untitled Tour'}</p>
                <p><span className="font-medium">Category:</span> {CATEGORIES.find(c => c.value === form.watch('category'))?.label || 'Not selected'}</p>
                <p><span className="font-medium">Duration:</span> {form.watch('duration')} minutes</p>
                <p><span className="font-medium">Distance:</span> {form.watch('distance') || 'Not specified'}</p>
                <p><span className="font-medium">Location:</span> {selectedLocation?.address || 'Not selected'}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-walkable-light-gray">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Create Your Tour
            </h1>
            <p className="text-xl text-walkable-gray">
              Share your local knowledge and create memorable walking experiences
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-walkable-gray">Step {currentStep} of 3</span>
              <span className="text-sm text-walkable-gray">{Math.round((currentStep / 3) * 100)}% Complete</span>
            </div>
            <Progress value={(currentStep / 3) * 100} className="h-2" />
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Card>
                <CardContent className="pt-6">
                  {renderStepContent()}
                </CardContent>
              </Card>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleCreateTour}
                    disabled={createTourMutation.isPending}
                    className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white"
                  >
                    {createTourMutation.isPending ? 'Creating Tour...' : 'Create Tour'}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
