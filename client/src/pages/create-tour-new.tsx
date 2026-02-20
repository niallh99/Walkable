import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Upload, Camera, Mic, Edit, Trash2, GripVertical, ArrowUp, ArrowDown, AlertTriangle, Loader2, Users, UserPlus, X, Crown, Eye, CheckCircle2 } from 'lucide-react';
import { InteractiveMap } from '@/components/interactive-map';
import { LocationSearch } from '@/components/location-search';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-context';
import { apiRequest } from '@/lib/queryClient';

// Types
interface TourDetails {
  title: string;
  description: string;
  category: string;
  price: string;
  currency: string;
  coverImage: File | null;
  coverImagePreview: string;
  existingCoverImageUrl?: string;
}

interface TourStop {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  audioFile: File | null;
  videoFile: File | null;
  audioFileName: string;
  videoFileName: string;
  mediaType: 'audio' | 'video';
  order: number;
  existingAudioUrl?: string;
  existingVideoUrl?: string;
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
    price: '0',
    currency: 'EUR',
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
    videoFile: null,
    audioFileName: '',
    videoFileName: '',
    mediaType: 'audio',
  });
  const [selectedLocation, setSelectedLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number; address?: string} | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if we're in edit mode
  const search = useSearch();
  const urlParams = new URLSearchParams(search);
  const editTourId = urlParams.get('edit');
  const isEditMode = !!editTourId;
  const tabParam = urlParams.get('tab');

  // Post-create success state
  const [createdTour, setCreatedTour] = useState<{ id: number; title: string } | null>(null);

  // Collaborators state
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');

  // Fetch existing tour data when in edit mode
  const { data: existingTour, isLoading: isLoadingTour } = useQuery({
    queryKey: [`/api/tours/${editTourId}/details`],
    enabled: isEditMode,
  });

  // Fetch collaborators when in edit mode
  const { data: collaborators = [], isLoading: isLoadingCollaborators } = useQuery<any[]>({
    queryKey: [`/api/tours/${editTourId}/collaborators`],
    queryFn: async () => {
      const response = await apiRequest(`/api/tours/${editTourId}/collaborators`);
      return response.json();
    },
    enabled: isEditMode,
  });

  // Invite collaborator mutation
  const inviteCollaboratorMutation = useMutation({
    mutationFn: async ({ username, role }: { username: string; role: string }) => {
      const response = await apiRequest(`/api/tours/${editTourId}/collaborators`, {
        method: 'POST',
        body: { username, role },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tours/${editTourId}/collaborators`] });
      setInviteUsername('');
      toast({ title: 'Invitation sent!', description: `${inviteUsername} has been invited as a collaborator.` });
    },
    onError: (error: any) => {
      toast({ title: 'Invitation failed', description: error.message || 'Could not send invitation.', variant: 'destructive' });
    },
  });

  // Remove collaborator mutation
  const removeCollaboratorMutation = useMutation({
    mutationFn: async (collaboratorId: number) => {
      const response = await apiRequest(`/api/collaborators/${collaboratorId}`, {
        method: 'DELETE',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tours/${editTourId}/collaborators`] });
      toast({ title: 'Collaborator removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Remove failed', description: error.message, variant: 'destructive' });
    },
  });

  // Populate form with existing tour data
  useEffect(() => {
    if (existingTour && isEditMode) {
      const tour = existingTour as any; // Type assertion for now
      setTourDetails({
        title: tour.title || '',
        description: tour.description || '',
        category: tour.category || '',
        price: tour.price?.toString() || '0',
        currency: tour.currency || 'EUR',
        coverImage: null,
        coverImagePreview: tour.coverImageUrl || '',
        existingCoverImageUrl: tour.coverImageUrl || '',
      });

      if (tour.stops && tour.stops.length > 0) {
        const formattedStops: TourStop[] = tour.stops.map((stop: any, index: number) => ({
          id: stop.id?.toString() || `existing-${index}`,
          title: stop.title || '',
          description: stop.description || '',
          latitude: parseFloat(stop.latitude) || 0,
          longitude: parseFloat(stop.longitude) || 0,
          audioFile: null,
          videoFile: null,
          audioFileName: stop.audioFileUrl ? 'existing-audio.mp3' : '',
          videoFileName: stop.videoFileUrl ? 'existing-video.mp4' : '',
          mediaType: stop.mediaType || (stop.audioFileUrl ? 'audio' : stop.videoFileUrl ? 'video' : 'audio'),
          order: stop.order || index + 1,
          existingAudioUrl: stop.audioFileUrl || '',
          existingVideoUrl: stop.videoFileUrl || '',
        }));
        setTourStops(formattedStops);
      }
    }
  }, [existingTour, isEditMode]);

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

  const uploadVideoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('video', file);
      const response = await apiRequest('/api/upload/video', {
        method: 'POST',
        body: formData,
      });
      return response.json();
    },
  });

  const createTourMutation = useMutation({
    mutationFn: async (tourData: any) => {
      const endpoint = isEditMode ? `/api/tours/${editTourId}` : '/api/tours';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await apiRequest(endpoint, {
        method,
        body: tourData,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/users', user.id, 'tours'] });
      }
      if (isEditMode) {
        queryClient.invalidateQueries({ queryKey: [`/api/tours/${editTourId}/details`] });
        toast({
          title: "Tour updated successfully!",
          description: "Your tour changes have been saved.",
        });
        setLocation('/profile');
      } else {
        // Show in-page success screen so the creator can invite collaborators
        setCreatedTour({ id: data.id, title: data.title });
      }
    },
    onError: (error: any) => {
      setIsCreating(false);
      toast({
        title: isEditMode ? "Tour not updated" : "Tour not created",
        description: error.message || `${isEditMode ? 'Update' : 'Creation'} failed. Please try again.`,
        variant: "destructive",
      });
    },
  });

  // Delete tour mutation
  const deleteTourMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/tours/${editTourId}`, {
        method: 'DELETE',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tours'] });
      // Invalidate user's tours list to update profile page after deletion
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/users', user.id, 'tours'] });
      }
      toast({
        title: "Tour deleted successfully!",
        description: "Your tour has been permanently deleted.",
      });
      setLocation('/profile');
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting tour",
        description: error.message || "Failed to delete tour. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteTour = () => {
    if (window.confirm('Are you sure you want to delete this tour? This action cannot be undone.')) {
      deleteTourMutation.mutate();
    }
  };

  // Prevent navigation during tour creation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isCreating || createTourMutation.isPending) {
        e.preventDefault();
        e.returnValue = 'Your tour is being created. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isCreating, createTourMutation.isPending]);

  // Collaborators tab renderer
  const renderCollaboratorsTab = () => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
    };

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Collaborators</h2>
          <p className="text-gray-600">Invite others to help build this tour. Editors can add stops; viewers can preview the tour.</p>
        </div>

        {/* Invite form */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-walkable-cyan" />
            Invite a Collaborator
          </h3>
          <div className="flex gap-3">
            <Input
              placeholder="Username"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inviteUsername.trim()) {
                  inviteCollaboratorMutation.mutate({ username: inviteUsername.trim(), role: inviteRole });
                }
              }}
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'editor' | 'viewer')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">
                  <div className="flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Editor
                  </div>
                </SelectItem>
                <SelectItem value="viewer">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Viewer
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                if (inviteUsername.trim()) {
                  inviteCollaboratorMutation.mutate({ username: inviteUsername.trim(), role: inviteRole });
                }
              }}
              disabled={!inviteUsername.trim() || inviteCollaboratorMutation.isPending}
              className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white"
            >
              {inviteCollaboratorMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Invite'
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Editors can add and edit tour stops. Viewers can preview the tour draft.
          </p>
        </Card>

        {/* Collaborators list */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-walkable-cyan" />
            Current Collaborators
          </h3>
          {isLoadingCollaborators ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-walkable-cyan" />
            </div>
          ) : collaborators.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No collaborators yet.</p>
              <p className="text-sm">Invite someone above to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {collaborators.map((collab: any) => (
                <div key={collab.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium text-sm">
                      {collab.invitedUser?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{collab.invitedUser?.username || 'Unknown user'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 capitalize flex items-center gap-1">
                          {collab.role === 'editor' ? <Crown className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {collab.role}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${statusColors[collab.status] || 'bg-gray-100 text-gray-800'}`}>
                          {collab.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => removeCollaboratorMutation.mutate(collab.id)}
                    disabled={removeCollaboratorMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  };

  // Success screen shown after a new tour is created
  const renderSuccessScreen = (tour: { id: number; title: string }) => (
    <div className="max-w-lg mx-auto text-center py-10 space-y-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-10 w-10 text-green-500" />
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tour Created!</h1>
        <p className="text-gray-600">
          <span className="font-semibold">{tour.title}</span> is now live and
          ready for discovery.
        </p>
      </div>

      <div className="bg-walkable-cyan/10 border border-walkable-cyan/30 rounded-xl p-4 text-sm text-gray-700">
        <p className="font-medium text-walkable-cyan mb-1">Want to build it together?</p>
        <p>Invite co-creators to help add stops, record audio, or review your tour before it goes public.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button
          onClick={() => setLocation(`/create-tour?edit=${tour.id}&tab=collaborators`)}
          className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Invite Collaborators
        </Button>
        <Button
          variant="outline"
          onClick={() => setLocation(`/tour/${tour.id}`)}
        >
          View Tour
        </Button>
        <Button
          variant="ghost"
          onClick={() => setLocation('/profile')}
        >
          Back to Profile
        </Button>
      </div>
    </div>
  );

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
    // In edit mode, allow continuing even without changes since form is pre-populated
    if (isEditMode) {
      return tourDetails.title.trim() && 
             tourDetails.description.trim() && 
             tourDetails.category &&
             (tourDetails.coverImage || tourDetails.existingCoverImageUrl);
    }
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
        videoFile: null,
        videoFileName: '',
        mediaType: 'audio',
      }));
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCurrentStop(prev => ({
        ...prev,
        videoFile: file,
        videoFileName: file.name,
        audioFile: null,
        audioFileName: '',
        mediaType: 'video',
      }));
    }
  };

  const addStop = () => {
    if (!currentStop.title || !selectedLocation) return;

    const newStop: TourStop = {
      id: Date.now().toString(),
      title: currentStop.title,
      description: currentStop.description || '',
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      audioFile: currentStop.audioFile || null,
      videoFile: currentStop.videoFile || null,
      audioFileName: currentStop.audioFileName || '',
      videoFileName: currentStop.videoFileName || '',
      mediaType: currentStop.mediaType || 'audio',
      order: tourStops.length + 1,
    };

    setTourStops(prev => [...prev, newStop]);
    setCurrentStop({
      title: '',
      description: '',
      latitude: 0,
      longitude: 0,
      audioFile: null,
      videoFile: null,
      audioFileName: '',
      videoFileName: '',
      mediaType: 'audio',
    });
    // Keep selectedLocation to maintain the cyan waypoint for next stop placement
    // This prevents the "Your Location" blue waypoint from reappearing
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

  const editStop = (index: number) => {
    const stopToEdit = tourStops[index];
    setCurrentStop({
      title: stopToEdit.title,
      description: stopToEdit.description || '',
      latitude: stopToEdit.latitude,
      longitude: stopToEdit.longitude,
      audioFile: stopToEdit.audioFile,
      audioFileName: stopToEdit.audioFileName || '',
    });
    setSelectedLocation({
      latitude: stopToEdit.latitude,
      longitude: stopToEdit.longitude,
    });
    // Remove the stop from the list so it can be re-added after editing
    deleteStop(index);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isEditMode ? "Edit your audio tour" : "Let's create your audio tour"}
        </h1>
        {isEditMode && (
          <div className="mt-4">
            <Button
              variant="destructive"
              onClick={handleDeleteTour}
              disabled={deleteTourMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {deleteTourMutation.isPending ? 'Deleting...' : 'Delete Tour'}
            </Button>
          </div>
        )}
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={tourDetails.price}
              onChange={(e) => setTourDetails(prev => ({ ...prev, price: e.target.value }))}
            />
            <p className="text-xs text-gray-500 mt-1">Set to 0 for a free tour</p>
          </div>
          <Select value={tourDetails.currency} onValueChange={(value) => setTourDetails(prev => ({ ...prev, currency: value }))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
          userLocation={userLocation || undefined}
          activeLocation={selectedLocation || undefined}
          selectedLocation={selectedLocation || undefined}
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
            <label className="block text-sm font-medium text-gray-700 mb-3">Media Guide</label>
            
            {/* Media Type Selection */}
            <div className="flex gap-4 mb-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="mediaType"
                  value="audio"
                  checked={currentStop.mediaType === 'audio'}
                  onChange={() => setCurrentStop(prev => ({ ...prev, mediaType: 'audio', videoFile: null, videoFileName: '' }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium">🎵 Audio Guide</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="mediaType"
                  value="video"
                  checked={currentStop.mediaType === 'video'}
                  onChange={() => setCurrentStop(prev => ({ ...prev, mediaType: 'video', audioFile: null, audioFileName: '' }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium">🎥 Video Guide</span>
              </label>
            </div>

            {/* Upload Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled
                className="text-gray-400"
              >
                <Mic className="h-4 w-4 mr-2" />
                Record Audio/Video (Coming Soon)
              </Button>
              {currentStop.mediaType === 'audio' ? (
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('audio-upload')?.click()}
                >
                  Upload Audio
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('video-upload')?.click()}
                >
                  Upload Video
                </Button>
              )}
            </div>
            
            {/* File Status */}
            {currentStop.audioFileName && currentStop.mediaType === 'audio' && (
              <p className="text-sm text-green-600 mt-2">✓ {currentStop.audioFileName}</p>
            )}
            {currentStop.videoFileName && currentStop.mediaType === 'video' && (
              <p className="text-sm text-green-600 mt-2">✓ {currentStop.videoFileName}</p>
            )}
            
            {/* Hidden File Inputs */}
            <input
              id="audio-upload"
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
              onChange={handleAudioUpload}
              className="hidden"
            />
            <input
              id="video-upload"
              type="file"
              accept="video/*,.mp4,.mov,.webm"
              onChange={handleVideoUpload}
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
            disabled={!currentStop.title || !selectedLocation}
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
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {stop.mediaType === 'video' ? '🎥 Video' : '🎵 Audio'}
                        </span>
                        {(stop.audioFileName || stop.videoFileName || stop.existingAudioUrl || stop.existingVideoUrl) && (
                          <span className="text-xs text-green-600">✓ Media uploaded</span>
                        )}
                      </div>
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
                      onClick={() => editStop(index)}
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
    // Prevent multiple submissions
    if (isCreating || createTourMutation.isPending) {
      return;
    }

    if (tourStops.length === 0) {
      toast({
        title: "No stops added",
        description: "Please add at least one stop to your tour.",
        variant: "destructive",
      });
      return;
    }

    // Set creating state and show notification
    setIsCreating(true);
    toast({
      title: isEditMode ? "Updating tour..." : "Creating tour...",
      description: "Please wait while we process your tour.",
    });

    try {
      // Upload cover image first
      let coverImageUrl = '';
      if (tourDetails.coverImage) {
        const coverResult = await uploadCoverImageMutation.mutateAsync(tourDetails.coverImage);
        coverImageUrl = coverResult.imageUrl;
      } else if (tourDetails.existingCoverImageUrl) {
        // Keep existing cover image
        coverImageUrl = tourDetails.existingCoverImageUrl;
      }

      // Upload audio/video files for all stops
      const stopsWithMedia = await Promise.all(
        tourStops.map(async (stop) => {
          let audioUrl = '';
          let videoUrl = '';
          
          if (stop.mediaType === 'audio') {
            if (stop.audioFile) {
              // New audio file uploaded
              const audioResult = await uploadAudioMutation.mutateAsync(stop.audioFile);
              audioUrl = audioResult.audioUrl;
            } else if (stop.existingAudioUrl) {
              // Keep existing audio file
              audioUrl = stop.existingAudioUrl;
            }
          } else if (stop.mediaType === 'video') {
            if (stop.videoFile) {
              // New video file uploaded
              const videoResult = await uploadVideoMutation.mutateAsync(stop.videoFile);
              videoUrl = videoResult.videoUrl;
            } else if (stop.existingVideoUrl) {
              // Keep existing video file
              videoUrl = stop.existingVideoUrl;
            }
          }
          
          return {
            title: stop.title,
            description: stop.description,
            latitude: stop.latitude.toString(),
            longitude: stop.longitude.toString(),
            audioFileUrl: audioUrl,
            videoFileUrl: videoUrl,
            mediaType: stop.mediaType,
            order: stop.order,
          };
        })
      );

      // Calculate tour metrics from stops data
      const totalMediaDuration = stopsWithMedia.length * 5; // Approximate 5 min per stop
      const walkingDistance = stopsWithMedia.length > 1 ? (stopsWithMedia.length * 0.5).toFixed(1) : '0.5'; // Approximate 0.5km per stop

      // Create the complete tour data
      const tourData = {
        title: tourDetails.title,
        description: tourDetails.description,
        category: tourDetails.category,
        price: tourDetails.price || '0',
        currency: tourDetails.currency || 'EUR',
        latitude: stopsWithMedia[0]?.latitude || '0',
        longitude: stopsWithMedia[0]?.longitude || '0',
        audioFileUrl: stopsWithMedia[0]?.audioFileUrl || '',
        videoFileUrl: stopsWithMedia[0]?.videoFileUrl || '',
        mediaType: stopsWithMedia[0]?.mediaType || 'audio',
        duration: totalMediaDuration,
        distance: walkingDistance,
        coverImageUrl,
        stops: stopsWithMedia, // Include stops data
      };

      await createTourMutation.mutateAsync(tourData);
    } catch (error) {
      setIsCreating(false);
      console.error('Error creating tour:', error);
      toast({
        title: isEditMode ? "Tour not updated" : "Tour not created",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderStep3 = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isEditMode ? "Review Your Changes" : "Review Your Tour"}
        </h1>
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
          <div>
            <span className="font-medium">Price:</span>{' '}
            {parseFloat(tourDetails.price) > 0
              ? `${tourDetails.currency} ${parseFloat(tourDetails.price).toFixed(2)}`
              : 'Free'}
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
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                    {stop.mediaType === 'video' ? '🎥 Video' : '🎵 Audio'}
                  </span>
                  {stop.mediaType === 'video' ? (
                    // Video handling
                    stop.videoFile ? (
                      <div className="flex items-center gap-2">
                        <video controls className="h-16 w-24 rounded">
                          <source src={URL.createObjectURL(stop.videoFile)} type={stop.videoFile.type} />
                          Your browser does not support the video element.
                        </video>
                        <p className="text-xs text-gray-500">{stop.videoFileName}</p>
                      </div>
                    ) : stop.existingVideoUrl ? (
                      <div className="flex items-center gap-2">
                        <video controls className="h-16 w-24 rounded">
                          <source src={stop.existingVideoUrl} />
                          Your browser does not support the video element.
                        </video>
                        <p className="text-xs text-gray-500">Existing video file</p>
                      </div>
                    ) : (
                      <p className="text-xs text-red-500">No video file</p>
                    )
                  ) : (
                    // Audio handling
                    stop.audioFile ? (
                      <div className="flex items-center gap-2">
                        <audio controls className="h-8">
                          <source src={URL.createObjectURL(stop.audioFile)} type={stop.audioFile.type} />
                          Your browser does not support the audio element.
                        </audio>
                        <p className="text-xs text-gray-500">{stop.audioFileName}</p>
                      </div>
                    ) : stop.existingAudioUrl ? (
                      <div className="flex items-center gap-2">
                        <audio controls className="h-8">
                          <source src={stop.existingAudioUrl} />
                          Your browser does not support the audio element.
                        </audio>
                        <p className="text-xs text-gray-500">Existing audio file</p>
                      </div>
                    ) : (
                      <p className="text-xs text-red-500">No audio file</p>
                    )
                  )}
                </div>
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
          disabled={isCreating || createTourMutation.isPending}
        >
          Back
        </Button>
        <Button
          onClick={handleCreateTour}
          disabled={isCreating || createTourMutation.isPending}
          className="flex-1 bg-walkable-cyan hover:bg-walkable-cyan-dark text-white"
        >
          {(isCreating || createTourMutation.isPending) ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEditMode ? 'Updating Tour...' : 'Creating Tour...'}
            </div>
          ) : (
            isEditMode ? 'Update Tour' : 'Create Tour'
          )}
        </Button>
      </div>
    </div>
  );

  // Show loading state when in edit mode and fetching data
  if (isEditMode && isLoadingTour) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-walkable-cyan mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading tour data...</h2>
              <p className="text-gray-600">Please wait while we fetch your tour information.</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-24 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {!isEditMode && createdTour ? (
            <div className="bg-white rounded-lg shadow-sm p-8">
              {renderSuccessScreen(createdTour)}
            </div>
          ) : isEditMode ? (
            <Tabs defaultValue={tabParam === 'collaborators' ? 'collaborators' : 'tour'}>
              <TabsList className="mb-6 w-full max-w-xs mx-auto grid grid-cols-2">
                <TabsTrigger value="tour">Edit Tour</TabsTrigger>
                <TabsTrigger value="collaborators" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Collaborators
                  {collaborators.filter((c: any) => c.status === 'pending').length > 0 && (
                    <span className="ml-1 bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                      {collaborators.filter((c: any) => c.status === 'pending').length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tour">
                <StepProgress currentStep={currentStep} />
                <div className="bg-white rounded-lg shadow-sm p-8">
                  {currentStep === 1 && renderStep1()}
                  {currentStep === 2 && renderStep2()}
                  {currentStep === 3 && renderStep3()}
                </div>
              </TabsContent>

              <TabsContent value="collaborators">
                <div className="bg-white rounded-lg shadow-sm p-8">
                  {renderCollaboratorsTab()}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <>
              <StepProgress currentStep={currentStep} />
              <div className="bg-white rounded-lg shadow-sm p-8">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}