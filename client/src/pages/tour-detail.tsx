import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { InteractiveMap } from "@/components/interactive-map";
import { useAuth } from "@/components/auth-context";
import { WalkingMode } from "@/components/walking-mode";
import { ArrowLeft, Play, Pause, Clock, MapPin, Volume2, Video, Loader2, CheckCircle2, Circle, PartyPopper, Lock, Footprints } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Tour, TourStop } from "@shared/schema";

interface TourWithStops extends Tour {
  stops: TourStop[];
}

interface StopProgress {
  stopId: number;
  completedAt: string;
}

function isTourFree(tour: Tour): boolean {
  return !tour.price || parseFloat(tour.price) === 0;
}

function formatTourPrice(tour: Tour): string {
  if (isTourFree(tour)) return 'Free';
  const symbol = tour.currency === 'GBP' ? '£' : tour.currency === 'USD' ? '$' : '€';
  return `${symbol}${parseFloat(tour.price).toFixed(2)}`;
}

export default function TourDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [currentVideo, setCurrentVideo] = useState<HTMLVideoElement | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isWalkingMode, setIsWalkingMode] = useState(false);
  const nextStopRef = useRef<HTMLDivElement>(null);

  const { data: tour, isLoading } = useQuery<TourWithStops>({
    queryKey: [`/api/tours/${id}/details`],
  });

  // Fetch progress for logged-in user
  const { data: progressData } = useQuery<StopProgress[]>({
    queryKey: [`/api/tours/${id}/progress`],
    queryFn: async () => {
      const response = await apiRequest(`/api/tours/${id}/progress`);
      return response.json();
    },
    enabled: !!user && !!id,
  });

  const completedStopIds = new Set(
    (progressData || []).map((p) => p.stopId)
  );

  // Mark stop as visited mutation
  const markStopMutation = useMutation({
    mutationFn: async (stopId: number) => {
      await apiRequest(`/api/tours/${id}/progress`, {
        method: 'POST',
        body: { stopId },
      });
      return stopId;
    },
    onSuccess: (stopId) => {
      queryClient.invalidateQueries({ queryKey: [`/api/tours/${id}/progress`] });

      const tourStops = tour?.stops || [];
      const newCompletedCount = completedStopIds.size + 1;
      if (newCompletedCount >= tourStops.length && tourStops.length > 0) {
        // All stops done — show celebration
        setShowCelebration(true);
        // Also invalidate completed tours on profile
        if (user) {
          queryClient.invalidateQueries({ queryKey: ['/api/users', user.id, 'completed-tours'] });
        }
      } else {
        const stop = tourStops.find((s) => s.id === stopId);
        toast({
          title: "Stop completed!",
          description: stop ? `"${stop.title}" marked as visited.` : "Stop marked as visited.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update progress",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
      }
      if (currentVideo) {
        currentVideo.pause();
        currentVideo.src = '';
      }
    };
  }, [currentAudio, currentVideo]);

  // Scroll to the next incomplete stop when progress loads
  useEffect(() => {
    if (progressData && progressData.length > 0 && tour?.stops?.length && nextStopRef.current) {
      nextStopRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [progressData, tour?.stops?.length]);

  const playStop = (stop: TourStop, index: number) => {
    const hasAudio = stop.audioFileUrl;
    const hasVideo = stop.videoFileUrl;
    const mediaType = stop.mediaType || (hasAudio ? 'audio' : hasVideo ? 'video' : null);

    if (!hasAudio && !hasVideo) {
      toast({
        title: "No media available",
        description: "This stop doesn't have any audio or video guide.",
        variant: "destructive",
      });
      return;
    }

    // Stop current media if playing
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }
    if (currentVideo) {
      currentVideo.pause();
      setCurrentVideo(null);
    }
    setCurrentlyPlaying(null);

    // If clicking the same stop that's playing, just pause
    if (currentlyPlaying === index) {
      return;
    }

    if (mediaType === 'video' && hasVideo && stop.videoFileUrl) {
      // Create video element and play video
      const video = document.createElement('video');
      video.src = stop.videoFileUrl;
      video.controls = true;
      video.style.width = '100%';
      video.style.maxWidth = '500px';
      video.style.borderRadius = '8px';

      video.play().catch((error) => {
        console.error('Error playing video:', error);
        toast({
          title: "Video playback failed",
          description: "Unable to play the video. Please check your browser settings.",
          variant: "destructive",
        });
      });

      video.onended = () => {
        setCurrentlyPlaying(null);
        setCurrentVideo(null);
      };

      setCurrentVideo(video);
      setCurrentlyPlaying(index);

      // Show video in modal or overlay
      const modalOverlay = document.createElement('div');
      modalOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.8); display: flex; align-items: center;
        justify-content: center; z-index: 1000; padding: 20px;
      `;

      const closeButton = document.createElement('button');
      closeButton.innerHTML = '×';
      closeButton.style.cssText = `
        position: absolute; top: 20px; right: 30px; background: white;
        border: none; border-radius: 50%; width: 40px; height: 40px;
        font-size: 24px; cursor: pointer; z-index: 1001;
      `;

      closeButton.onclick = () => {
        video.pause();
        document.body.removeChild(modalOverlay);
        setCurrentlyPlaying(null);
        setCurrentVideo(null);
      };

      modalOverlay.appendChild(video);
      modalOverlay.appendChild(closeButton);
      document.body.appendChild(modalOverlay);

      toast({
        title: "Playing video",
        description: `Now playing: ${stop.title}`,
      });
    } else if (mediaType === 'audio' && hasAudio && stop.audioFileUrl) {
      // Play audio
      const audio = new Audio(stop.audioFileUrl);
      audio.play().catch((error) => {
        console.error('Error playing audio:', error);
        toast({
          title: "Audio playback failed",
          description: "Unable to play the audio. Please check your browser settings.",
          variant: "destructive",
        });
      });

      audio.onended = () => {
        setCurrentlyPlaying(null);
        setCurrentAudio(null);
      };

      setCurrentAudio(audio);
      setCurrentlyPlaying(index);

      toast({
        title: "Playing audio",
        description: `Now playing: ${stop.title}`,
      });
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      history: "bg-amber-100 text-amber-800",
      culture: "bg-purple-100 text-purple-800",
      architecture: "bg-blue-100 text-blue-800",
      nature: "bg-green-100 text-green-800",
      food: "bg-orange-100 text-orange-800",
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-16 flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-walkable-cyan mx-auto mb-4" />
            <p className="text-gray-600">Loading tour details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-16 flex flex-col items-center justify-center h-96 space-y-4">
          <div className="text-lg text-gray-600">Tour not found</div>
          <Link href="/discover">
            <Button className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Discover
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Handle missing stops gracefully
  const tourStops = tour.stops || [];
  const hasStops = tourStops.length > 0;
  const completedCount = tourStops.filter((s) => completedStopIds.has(s.id)).length;
  const progressPercent = hasStops ? Math.round((completedCount / tourStops.length) * 100) : 0;
  const allComplete = hasStops && completedCount === tourStops.length;

  const isPaidTour = !isTourFree(tour);

  // Find first incomplete stop index for "resume" highlighting
  const nextIncompleteIndex = tourStops.findIndex((s) => !completedStopIds.has(s.id));

  // Convert tour and stops to map format
  const tourStopsForMap = tourStops.map(stop => ({
    id: stop.id.toString(),
    title: stop.title,
    latitude: parseFloat(stop.latitude),
    longitude: parseFloat(stop.longitude),
    order: stop.order,
  }));

  // If no stops, use tour's main location as a single stop for map centering
  const mapStops = hasStops ? tourStopsForMap : [{
    id: 'main',
    title: tour.title,
    latitude: parseFloat(tour.latitude),
    longitude: parseFloat(tour.longitude),
    order: 1,
  }];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-16">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center space-x-4 mb-4">
              <Link href="/discover">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Discover
                </Button>
              </Link>
            </div>

            <div className="flex flex-col space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{tour.title}</h1>
                <div className="flex items-center gap-2">
                  <Badge className={getCategoryColor(tour.category)}>
                    {tour.category}
                  </Badge>
                  <Badge className={isTourFree(tour)
                    ? 'bg-green-500 text-white hover:bg-green-500'
                    : 'bg-amber-500 text-white hover:bg-amber-500'
                  }>
                    {formatTourPrice(tour)}
                  </Badge>
                </div>
              </div>

              <p className="text-gray-600 text-lg max-w-3xl">
                {tour.description}
              </p>

              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{tour.duration || 60} minutes</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{tour.distance || '2.5'} km walking distance</span>
                </div>
                <div className="flex items-center">
                  <Volume2 className="h-4 w-4 mr-1" />
                  <span>{tourStops.length} media stops</span>
                </div>
              </div>

              {/* Start Walking button — for free tours with stops */}
              {user && hasStops && !isPaidTour && (
                <div>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setIsWalkingMode(true)}
                  >
                    <Footprints className="h-4 w-4 mr-2" />
                    Start Walking
                  </Button>
                </div>
              )}

              {/* Progress bar — only for logged-in users with stops */}
              {user && hasStops && (
                <div className="max-w-md">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 font-medium">
                      {allComplete ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Tour completed!
                        </span>
                      ) : (
                        `${completedCount} of ${tourStops.length} stops completed`
                      )}
                    </span>
                    <span className="text-gray-400">{progressPercent}%</span>
                  </div>
                  <Progress
                    value={progressPercent}
                    className="h-2 bg-gray-200"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coming Soon banner for paid tours */}
        {isPaidTour && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center gap-3">
              <Lock className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div>
                <span className="text-amber-800 font-medium">This is a paid tour ({formatTourPrice(tour)})</span>
                <span className="text-amber-600 ml-2">- Purchasing is coming soon. You can preview the tour stops below.</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex h-[calc(100vh-200px)]">
          {/* Left Sidebar - Tour Stops */}
          <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Media Tour Summary
              </h2>

              <div className="space-y-4">
                {!hasStops ? (
                  <div className="text-center py-8 text-gray-500">
                    <Volume2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No media stops available</p>
                    <p className="text-sm">This tour doesn't have detailed audio or video stops yet.</p>
                  </div>
                ) : (
                  tourStops.map((stop, index) => {
                    const isCompleted = completedStopIds.has(stop.id);
                    const isNextIncomplete = index === nextIncompleteIndex;
                    return (
                      <div
                        key={stop.id}
                        ref={isNextIncomplete ? nextStopRef : undefined}
                      >
                        <Card
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            currentlyPlaying === index ? 'ring-2 ring-walkable-cyan' : ''
                          } ${isNextIncomplete && !allComplete ? 'ring-2 ring-amber-400 bg-amber-50/50' : ''} ${
                            isCompleted ? 'bg-green-50/50 border-green-200' : ''
                          }`}
                          onClick={() => {
                            if (isPaidTour) {
                              toast({
                                title: "Paid tour",
                                description: "Purchasing tours is coming soon!",
                              });
                              return;
                            }
                            playStop(stop, index);
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                  isCompleted
                                    ? 'bg-green-500 text-white'
                                    : 'bg-walkable-cyan text-white'
                                }`}>
                                  {isCompleted ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                  ) : currentlyPlaying === index ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    (stop.mediaType === 'video' || stop.videoFileUrl) ? (
                                      <Video className="h-4 w-4" />
                                    ) : (
                                      <Play className="h-4 w-4" />
                                    )
                                  )}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className={`text-xs font-medium ${isCompleted ? 'text-green-600' : 'text-walkable-cyan'}`}>
                                    {index + 1}
                                  </span>
                                  <h3 className="text-sm font-medium text-gray-900 truncate">
                                    {stop.title}
                                  </h3>
                                  {isNextIncomplete && !allComplete && (
                                    <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px] px-1.5 py-0">
                                      Next
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {stop.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-500">
                                    {(stop.mediaType === 'video' || stop.videoFileUrl) ? '🎥 Video' : '🎵 Audio'}
                                  </span>
                                </div>

                                {/* Mark as Visited button — hidden for paid tours */}
                                {user && !isPaidTour && (
                                  <div className="mt-2">
                                    {isCompleted ? (
                                      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Visited
                                      </span>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs border-walkable-cyan text-walkable-cyan hover:bg-walkable-cyan hover:text-white"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markStopMutation.mutate(stop.id);
                                        }}
                                        disabled={markStopMutation.isPending}
                                      >
                                        {markStopMutation.isPending ? (
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        ) : (
                                          <Circle className="h-3 w-3 mr-1" />
                                        )}
                                        Mark as Visited
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Map */}
          <div className="flex-1 relative">
            <InteractiveMap
              tours={[]}
              tourStops={mapStops}
              onLocationRequest={() => {}}
              showRoute={hasStops}
            />
          </div>
        </div>
      </div>

      {/* Completion celebration dialog */}
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="py-6">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <PartyPopper className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Tour Completed!
            </h2>
            <p className="text-gray-600 mb-6">
              You've visited all {tourStops.length} stops on <span className="font-semibold">{tour.title}</span>. Great exploring!
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => setShowCelebration(false)}
              >
                Keep Exploring
              </Button>
              <Link href="/discover">
                <Button className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white">
                  Discover More Tours
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Walking mode overlay */}
      {isWalkingMode && hasStops && (
        <WalkingMode
          stops={tourStops}
          tourTitle={tour.title}
          onClose={() => setIsWalkingMode(false)}
        />
      )}

      <Footer />
    </div>
  );
}
