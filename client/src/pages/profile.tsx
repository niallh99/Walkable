import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from "@/lib/queryClient";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-context";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { User, MapPin, Clock, Edit2, Loader2, Calendar, Volume2 } from "lucide-react";
import { Tour, UpdateUserProfile } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

type CompletedTour = {
  id: number;
  userId: number;
  tourId: number;
  completedAt: string;
  tour: Tour;
};

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Fetch user's created tours
  const { data: createdTours = [], isLoading: isLoadingTours } = useQuery<Tour[]>({
    queryKey: ['/api/users', user?.id, 'tours'],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/users/${user.id}/tours`);
      if (!response.ok) throw new Error('Failed to fetch created tours');
      const data = await response.json();
      console.log('Created tours data:', data);
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's completed tours
  const { data: completedTours = [], isLoading: isLoadingCompleted } = useQuery<CompletedTour[]>({
    queryKey: ['/api/users', user?.id, 'completed-tours'],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/users/${user.id}/completed-tours`);
      if (!response.ok) throw new Error('Failed to fetch completed tours');
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updateData: UpdateUserProfile) => {
      if (!user?.id) throw new Error('User not authenticated');
      const response = await apiRequest(`/api/users/${user.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: ['/api/auth/user'],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditProfile = () => {
    if (user) {
      setEditUsername(user.username);
      setEditEmail(user.email);
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      username: editUsername,
      email: editEmail,
    });
  };

  // Debug logging
  console.log('Profile render - User:', user);
  console.log('Profile render - Created tours:', createdTours, 'Loading:', isLoadingTours);
  console.log('Profile render - Completed tours:', completedTours, 'Loading:', isLoadingCompleted);

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
                    Please log in to view your profile and manage your tours.
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

  return (
    <div className="min-h-screen bg-walkable-light-gray">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <Card className="mb-8">
            <CardContent className="pt-8 pb-6">
              <div className="flex flex-col md:flex-row md:items-start space-y-6 md:space-y-0 md:space-x-8">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                    <User className="h-16 w-16 text-white" />
                  </div>
                </div>
                
                {/* User Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{user.username}</h1>
                    <div className="flex items-center text-gray-600 mb-3">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>San Francisco, CA</span>
                    </div>
                    <p className="text-gray-700 text-base leading-relaxed mb-4">
                      Passionate explorer who loves discovering hidden gems and sharing amazing walking experiences.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                        <User className="h-3 w-3 mr-1" />
                        Creator
                      </Badge>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <MapPin className="h-3 w-3 mr-1" />
                        Explorer
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-3">
                      <span>@{user.username.toLowerCase()}</span>
                      <span>Joined 6/15/2023</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div></div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-walkable-cyan text-walkable-cyan hover:bg-walkable-cyan hover:text-white"
                      onClick={handleEditProfile}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{completedTours.length}</div>
                  <div className="text-sm text-gray-600">Tours Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">{createdTours.length}</div>
                  <div className="text-sm text-gray-600">Tours Created</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {createdTours.reduce((total, tour) => {
                      const distance = tour.distance ? parseFloat(tour.distance) : 0;
                      return total + (isNaN(distance) ? 0 : distance);
                    }, 0).toFixed(1)}km
                  </div>
                  <div className="text-sm text-gray-600">Distance Created</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <span className="text-3xl font-bold text-yellow-600 mr-1">4.8</span>
                    <span className="text-yellow-500">★</span>
                  </div>
                  <div className="text-sm text-gray-600">Avg Rating</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tours and Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Created Tours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>My Tours</span>
                  </div>
                  <Badge variant="secondary">{createdTours.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingTours ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-walkable-cyan" />
                  </div>
                ) : createdTours.length > 0 ? (
                  <div className="space-y-4">
                    {createdTours.map((tour) => (
                      <div key={tour.id} className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-walkable-cyan transition-colors">
                        <div className="w-12 h-12 bg-walkable-cyan rounded-lg flex items-center justify-center flex-shrink-0">
                          <Volume2 className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">{tour.title}</h4>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{tour.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <Badge variant="outline">{tour.category}</Badge>
                            {tour.duration && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{tour.duration} min</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(tour.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-walkable-cyan text-walkable-cyan hover:bg-walkable-cyan hover:text-white"
                            onClick={() => window.location.href = `/create-tour?edit=${tour.id}`}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Edit Tour
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-4">
                      <Button 
                        variant="outline" 
                        className="border-walkable-cyan text-walkable-cyan"
                        onClick={() => window.location.href = '/create-tour'}
                      >
                        Create Another Tour
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🎯</div>
                    <h4 className="font-medium text-gray-900 mb-2">No tours created yet</h4>
                    <p className="text-walkable-gray text-sm mb-4">
                      Share your local knowledge by creating your first audio tour
                    </p>
                    <Button 
                      className="bg-walkable-cyan hover:bg-walkable-cyan text-white"
                      onClick={() => window.location.href = '/create-tour'}
                    >
                      Create Your First Tour
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completed Tours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Completed Tours</span>
                  </div>
                  <Badge variant="secondary">{completedTours.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingCompleted ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-walkable-cyan" />
                  </div>
                ) : completedTours.length > 0 ? (
                  <div className="space-y-4">
                    {completedTours.map((completedTour) => (
                      <div key={completedTour.id} className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-walkable-cyan transition-colors">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Clock className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">{completedTour.tour.title}</h4>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{completedTour.tour.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <Badge variant="outline">{completedTour.tour.category}</Badge>
                            {completedTour.tour.duration && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{completedTour.tour.duration} min</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Completed {new Date(completedTour.completedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-4">
                      <Button 
                        variant="outline" 
                        className="border-walkable-cyan text-walkable-cyan"
                        onClick={() => window.location.href = '/discover'}
                      >
                        Discover More Tours
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🚶‍♂️</div>
                    <h4 className="font-medium text-gray-900 mb-2">No tours completed yet</h4>
                    <p className="text-walkable-gray text-sm mb-4">
                      Start exploring amazing audio tours in your area
                    </p>
                    <Button 
                      className="bg-walkable-cyan hover:bg-walkable-cyan text-white"
                      onClick={() => window.location.href = '/discover'}
                    >
                      Discover Tours
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile information here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
              className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}