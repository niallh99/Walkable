import { useState, useEffect, useRef } from "react";
import { Link, useParams, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { InteractiveMap } from "@/components/interactive-map";
import { useAuth } from "@/components/auth-context";
import { WalkingMode } from "@/components/walking-mode";
import { ArrowLeft, Play, Pause, Clock, MapPin, Volume2, Video, Loader2, CheckCircle2, Circle, PartyPopper, Lock, Footprints, Heart, ShoppingCart, Star, Share2, QrCode, Copy, Twitter, MessageCircle, Download } from "lucide-react";
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
  const [tipOpen, setTipOpen] = useState(false);
  const [customTipAmount, setCustomTipAmount] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const nextStopRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const searchString = useSearch();
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [hasSubmittedReview, setHasSubmittedReview] = useState(false);

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

  // Tip mutation
  const tipMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest(`/api/tours/${id}/tip`, {
        method: 'POST',
        body: { amount },
      });
      return response.json();
    },
    onSuccess: () => {
      setTipOpen(false);
      setCustomTipAmount('');
      toast({
        title: "Tip sent!",
        description: "Thank you for supporting this creator.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Tip failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/tours/${id}/purchase`, {
        method: 'POST',
      });
      return response.json();
    },
    onSuccess: (data: { checkoutUrl: string }) => {
      window.location.href = data.checkoutUrl;
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // QR code query — only fires when the modal is open
  const { data: qrImageUrl, isLoading: isLoadingQr } = useQuery<string>({
    queryKey: [`/api/tours/${id}/qr`],
    queryFn: async () => {
      const response = await apiRequest(`/api/tours/${id}/qr`);
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        return data.qrCode || data.qrCodeUrl || data.url || '';
      }
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    },
    enabled: qrOpen && !!id,
  });

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/tour/${id}` : '';

  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: tour?.title ?? 'Walking Tour',
          text: `Check out "${tour?.title}" on Walkable`,
          url: shareUrl,
        });
      } catch {
        // user cancelled — do nothing
      }
    } else {
      setShareOpen(true);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({ title: 'Link copied!', description: 'Tour link copied to clipboard.' });
      setShareOpen(false);
    });
  };

  // Reviews query
  const { data: reviewsData, isLoading: isLoadingReviews } = useQuery<{
    reviews: Array<{
      id: number;
      userId: number;
      rating: number;
      comment: string;
      createdAt: string;
      user: { username: string; profileImage?: string };
    }>;
    total: number;
  }>({
    queryKey: [`/api/tours/${id}/reviews`],
    queryFn: async () => {
      const response = await apiRequest(`/api/tours/${id}/reviews`);
      return response.json();
    },
    enabled: !!id,
  });

  const reviews = reviewsData?.reviews ?? [];
  const userAlreadyReviewed = !!user && reviews.some((r) => r.userId === user.id);

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment: string }) => {
      const response = await apiRequest(`/api/tours/${id}/reviews`, {
        method: 'POST',
        body: { rating, comment },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tours/${id}/reviews`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tours/${id}/details`] });
      setReviewRating(0);
      setReviewText('');
      setHasSubmittedReview(true);
      toast({ title: 'Review submitted!', description: 'Thank you for your feedback.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Review failed', description: error.message, variant: 'destructive' });
    },
  });

  // Handle ?purchase=success in URL
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get('purchase') === 'success') {
      toast({
        title: "Purchase successful!",
        description: "You now have full access to this tour. Enjoy!",
      });
      // Clean up the URL
      window.history.replaceState({}, '', `/tour/${id}`);
    }
  }, []);

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

  const handleSendTip = (amount: number) => {
    if (amount <= 0) return;
    tipMutation.mutate(amount);
  };

  const handleCustomTip = () => {
    const amount = parseFloat(customTipAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid tip amount.",
        variant: "destructive",
      });
      return;
    }
    handleSendTip(amount);
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

              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-500">
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
                {(tour as any).averageRating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-gray-700">
                      {parseFloat((tour as any).averageRating).toFixed(1)}
                    </span>
                    <span className="text-gray-400">
                      ({(tour as any).reviewCount ?? 0} {(tour as any).reviewCount === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Start Walking button — for free tours with stops */}
                {user && hasStops && !isPaidTour && (
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setIsWalkingMode(true)}
                  >
                    <Footprints className="h-4 w-4 mr-2" />
                    Start Walking
                  </Button>
                )}

                {/* Share button */}
                <Popover open={shareOpen} onOpenChange={setShareOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:border-walkable-cyan hover:text-walkable-cyan"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56" align="start">
                    <p className="text-sm font-medium text-gray-900 mb-3">Share this tour</p>
                    <div className="space-y-1">
                      <button
                        onClick={handleCopyLink}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <Copy className="h-4 w-4 text-gray-500" />
                        Copy link
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Check out "${tour.title}" on Walkable: ${shareUrl}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShareOpen(false)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <MessageCircle className="h-4 w-4 text-green-500" />
                        WhatsApp
                      </a>
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out "${tour.title}" on Walkable`)}&url=${encodeURIComponent(shareUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShareOpen(false)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <Twitter className="h-4 w-4 text-sky-500" />
                        Twitter / X
                      </a>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* QR code button */}
                <Button
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:border-walkable-cyan hover:text-walkable-cyan"
                  onClick={() => setQrOpen(true)}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Code
                </Button>

                {/* Tip button — for logged-in users viewing someone else's tour */}
                {user && tour.creatorId !== user.id && (
                  <Popover open={tipOpen} onOpenChange={setTipOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="border-pink-400 text-pink-600 hover:bg-pink-50"
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        Tip Creator
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="start">
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-900">Send a tip to the creator</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[2, 5, 10].map((amount) => (
                            <Button
                              key={amount}
                              size="sm"
                              variant="outline"
                              className="border-pink-300 hover:bg-pink-50 hover:text-pink-700"
                              onClick={() => handleSendTip(amount)}
                              disabled={tipMutation.isPending}
                            >
                              {tipMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                `€${amount}`
                              )}
                            </Button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">€</span>
                            <Input
                              type="number"
                              min="1"
                              step="0.50"
                              placeholder="Other"
                              value={customTipAmount}
                              onChange={(e) => setCustomTipAmount(e.target.value)}
                              className="pl-7 h-8 text-sm"
                            />
                          </div>
                          <Button
                            size="sm"
                            className="bg-pink-500 hover:bg-pink-600 text-white h-8"
                            onClick={handleCustomTip}
                            disabled={tipMutation.isPending || !customTipAmount}
                          >
                            {tipMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Send"
                            )}
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

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

        {/* Buy Tour banner for paid tours */}
        {isPaidTour && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <span className="text-amber-800 font-medium">This is a paid tour ({formatTourPrice(tour)})</span>
              </div>
              {user && (
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => purchaseMutation.mutate()}
                  disabled={purchaseMutation.isPending}
                >
                  {purchaseMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShoppingCart className="h-4 w-4 mr-2" />
                  )}
                  Buy Tour - {formatTourPrice(tour)}
                </Button>
              )}
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
                                description: "Purchase this tour to unlock all stops.",
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

      {/* Reviews Section */}
      <div ref={reviewsRef} className="bg-white border-t border-gray-200 py-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Reviews</h2>
            {(tour as any).averageRating > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${
                        s <= Math.round((tour as any).averageRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'fill-gray-200 text-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {parseFloat((tour as any).averageRating).toFixed(1)}
                </span>
                <span className="text-sm text-gray-400">
                  · {(tour as any).reviewCount ?? 0} {(tour as any).reviewCount === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            )}
          </div>

          {/* Review form — shown only when user has completed the tour and hasn't reviewed yet */}
          {user && allComplete && !userAlreadyReviewed && !hasSubmittedReview && (
            <div className="mb-8 p-5 border border-gray-200 rounded-xl bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Leave a Review</h3>

              {/* Star input */}
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    onMouseEnter={() => setReviewHover(star)}
                    onMouseLeave={() => setReviewHover(0)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        star <= (reviewHover || reviewRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                {reviewRating > 0 && (
                  <span className="ml-2 text-sm text-gray-500 self-center">
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][reviewRating]}
                  </span>
                )}
              </div>

              <Textarea
                placeholder="Share your experience (optional)..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="mb-3 resize-none"
                rows={3}
                maxLength={1000}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{reviewText.length}/1000</span>
                <Button
                  onClick={() => {
                    if (reviewRating === 0) {
                      toast({ title: 'Please select a star rating', variant: 'destructive' });
                      return;
                    }
                    submitReviewMutation.mutate({ rating: reviewRating, comment: reviewText });
                  }}
                  disabled={submitReviewMutation.isPending || reviewRating === 0}
                  className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white"
                >
                  {submitReviewMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                  ) : (
                    'Submit Review'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Prompt to complete tour */}
          {user && !allComplete && reviews.length === 0 && (
            <p className="text-sm text-gray-500 mb-6">
              Complete all stops to leave a review.
            </p>
          )}

          {/* Reviews list */}
          {isLoadingReviews ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-walkable-cyan" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No reviews yet. Be the first!</p>
          ) : (
            <div className="space-y-5">
              {reviews.map((review) => (
                <div key={review.id} className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-walkable-cyan to-cyan-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {review.user?.profileImage ? (
                      <img src={review.user.profileImage} alt={review.user.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-bold">
                        {review.user?.username?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{review.user?.username ?? 'Anonymous'}</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${
                              s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
            <div className="flex flex-col gap-3 items-center">
              <Button
                className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white w-full sm:w-auto"
                onClick={() => {
                  setShowCelebration(false);
                  setTimeout(() => reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
                }}
              >
                <Star className="h-4 w-4 mr-2" />
                Leave a Review
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCelebration(false)}
                >
                  Keep Exploring
                </Button>
                <Link href="/discover">
                  <Button variant="outline">
                    Discover More Tours
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-xs text-center">
          <div className="py-4">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Scan to open tour</h2>
            <p className="text-sm text-gray-500 mb-5">{tour.title}</p>
            {isLoadingQr ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-walkable-cyan" />
              </div>
            ) : qrImageUrl ? (
              <>
                <img
                  src={qrImageUrl}
                  alt={`QR code for ${tour.title}`}
                  className="mx-auto w-48 h-48 rounded-lg border border-gray-200"
                />
                <a
                  href={qrImageUrl}
                  download={`walkable-tour-${id}.png`}
                  className="mt-4 inline-flex items-center gap-2 text-sm text-walkable-cyan hover:underline"
                >
                  <Download className="h-4 w-4" />
                  Download QR code
                </a>
              </>
            ) : (
              <p className="text-sm text-red-500 py-8">Failed to load QR code.</p>
            )}
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
