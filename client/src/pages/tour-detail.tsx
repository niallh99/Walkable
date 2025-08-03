import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { InteractiveMap } from "@/components/interactive-map";
import { ArrowLeft, Play, Pause, Clock, MapPin, Volume2, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tour, TourStop } from "@shared/schema";

interface TourWithStops extends Tour {
  stops: TourStop[];
}

export default function TourDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [currentVideo, setCurrentVideo] = useState<HTMLVideoElement | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);

  const { data: tour, isLoading } = useQuery<TourWithStops>({
    queryKey: [`/api/tours/${id}/details`],
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
          <div className="text-lg text-gray-600">Loading tour details...</div>
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
                <Badge className={getCategoryColor(tour.category)}>
                  {tour.category}
                </Badge>
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
            </div>
          </div>
        </div>

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
                  tourStops.map((stop, index) => (
                  <Card 
                    key={stop.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      currentlyPlaying === index ? 'ring-2 ring-walkable-cyan' : ''
                    }`}
                    onClick={() => playStop(stop, index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-walkable-cyan text-white flex items-center justify-center text-sm font-medium">
                            {currentlyPlaying === index ? (
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
                            <span className="text-xs font-medium text-walkable-cyan">
                              {index + 1}
                            </span>
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {stop.title}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {stop.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {(stop.mediaType === 'video' || stop.videoFileUrl) ? '🎥 Video' : '🎵 Audio'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  ))
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
      
      <Footer />
    </div>
  );
}