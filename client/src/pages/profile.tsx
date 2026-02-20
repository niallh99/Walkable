import { useState, useRef } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { User, MapPin, Clock, Edit2, Loader2, Calendar, Volume2, Camera, Sparkles, CreditCard, CheckCircle, ExternalLink, Bell, UserCheck, UserX, Crown, Eye } from "lucide-react";
import { Tour, UpdateUserProfile, UserRole } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

type CompletedTour = {
  id: number;
  userId: number;
  tourId: number;
  completedAt: string;
  tour: Tour;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [formErrors, setFormErrors] = useState<{ username?: string; email?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch user's created tours
  const { data: createdTours = [], isLoading: isLoadingTours } = useQuery<Tour[]>({
    queryKey: ['/api/users', user?.id, 'tours'],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/users/${user.id}/tours`);
      if (!response.ok) throw new Error('Failed to fetch created tours');
      const data = await response.json();
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
      const response = await apiRequest('/api/users/profile', {
        method: 'PUT',
        body: updateData,
      });
      return response.json();
    },
    onSuccess: (data) => {
      updateUser(data);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Profile image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profileImage', file);
      const response = await apiRequest('/api/users/profile-image', {
        method: 'POST',
        body: formData,
      });
      return response.json();
    },
    onSuccess: (data) => {
      updateUser({ profileImage: data.profileImage });
      setImagePreview(null);
      toast({
        title: "Profile image updated",
        description: "Your profile image has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      setImagePreview(null);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (role: UserRole) => {
      await apiRequest('/api/users/role', {
        method: 'PUT',
        body: { role },
      });
      return role;
    },
    onSuccess: (role) => {
      updateUser({ role });
      toast({
        title: "You're now a Creator!",
        description: "You can now create and share walking tours.",
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

  // Stripe Connect status query (only for creators)
  const { data: stripeStatus, isLoading: isLoadingStripeStatus } = useQuery<{
    connected: boolean;
    accountId?: string;
    onboardingComplete?: boolean;
  }>({
    queryKey: ['/api/stripe/connect/status'],
    queryFn: async () => {
      const response = await apiRequest('/api/stripe/connect/status');
      return response.json();
    },
    enabled: !!user && user.role === 'creator',
  });

  // Stripe Connect onboarding mutation
  const stripeConnectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/stripe/connect', {
        method: 'POST',
      });
      return response.json();
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({
        title: "Stripe setup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch follow stats for own profile
  const { data: followStats } = useQuery<{
    followerCount: number;
    followingCount: number;
    isFollowing: boolean;
  }>({
    queryKey: ['/api/users', user?.id, 'follow-stats'],
    queryFn: async () => {
      const res = await apiRequest(`/api/users/${user!.id}/follow-stats`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Fetch collaborator invitations for current user
  const { data: invitations = [], isLoading: isLoadingInvitations } = useQuery<any[]>({
    queryKey: ['/api/users/invitations'],
    queryFn: async () => {
      const response = await apiRequest('/api/users/invitations');
      return response.json();
    },
    enabled: !!user,
  });

  // Respond to invitation mutation
  const respondInvitationMutation = useMutation({
    mutationFn: async ({ collaboratorId, status }: { collaboratorId: number; status: 'accepted' | 'declined' }) => {
      const response = await apiRequest(`/api/collaborators/${collaboratorId}/respond`, {
        method: 'PUT',
        body: { status },
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/invitations'] });
      toast({
        title: variables.status === 'accepted' ? 'Invitation accepted!' : 'Invitation declined',
        description: variables.status === 'accepted'
          ? "You're now a collaborator on this tour."
          : 'The invitation has been declined.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to respond', description: error.message, variant: 'destructive' });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, or GIF image.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast({
        title: "File too large",
        description: "Image must be under 5MB.",
        variant: "destructive",
      });
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    uploadImageMutation.mutate(file);

    // Reset file input so the same file can be re-selected
    e.target.value = '';
  };

  const handleEditProfile = () => {
    if (user) {
      setEditUsername(user.username);
      setEditEmail(user.email);
      setEditBio(user.bio || '');
      setEditLocation(user.location || '');
      setFormErrors({});
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveProfile = () => {
    const errors: { username?: string; email?: string } = {};

    if (!editUsername.trim()) {
      errors.username = 'Username is required';
    } else if (editUsername.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    if (!editEmail.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    updateProfileMutation.mutate({
      username: editUsername,
      email: editEmail,
      bio: editBio || undefined,
      location: editLocation || undefined,
    });
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

  const displayImage = imagePreview || user.profileImage;

  return (
    <div className="min-h-screen bg-walkable-light-gray">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <Card className="mb-8">
            <CardContent className="pt-8 pb-6">
              <div className="flex flex-col md:flex-row md:items-start space-y-6 md:space-y-0 md:space-x-8">
                {/* Avatar with upload */}
                <div className="flex-shrink-0">
                  <div
                    className="relative w-32 h-32 rounded-full group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-32 h-32 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt={user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-16 w-16 text-white" />
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadImageMutation.isPending ? (
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      ) : (
                        <Camera className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{user.username}</h1>
                    {user.location && (
                      <div className="flex items-center text-gray-600 mb-3">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{user.location}</span>
                      </div>
                    )}
                    {user.bio && (
                      <p className="text-gray-700 text-base leading-relaxed mb-4">
                        {user.bio}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 items-center">
                      {user.role === 'creator' ? (
                        <>
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Creator
                          </Badge>
                          {!isLoadingStripeStatus && stripeStatus?.connected ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Payments Active
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-500 text-green-700 hover:bg-green-50 h-6 text-xs"
                              onClick={() => stripeConnectMutation.mutate()}
                              disabled={stripeConnectMutation.isPending || isLoadingStripeStatus}
                            >
                              {stripeConnectMutation.isPending ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <CreditCard className="h-3 w-3 mr-1" />
                              )}
                              Set Up Payments
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            <MapPin className="h-3 w-3 mr-1" />
                            Explorer
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-400 text-blue-600 hover:bg-blue-50 h-6 text-xs"
                            onClick={() => updateRoleMutation.mutate('creator')}
                            disabled={updateRoleMutation.isPending}
                          >
                            {updateRoleMutation.isPending ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3 mr-1" />
                            )}
                            Become a Creator
                          </Button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-3">
                      <span>@{user.username.toLowerCase()}</span>
                      <span>Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'recently'}</span>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-8 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{completedTours.length}</div>
                  <div className="text-sm text-gray-600">Completed</div>
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
                  <div className="text-sm text-gray-600">Distance</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-walkable-cyan mb-1">
                    {followStats?.followerCount ?? 0}
                  </div>
                  <div className="text-sm text-gray-600">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-cyan-500 mb-1">
                    {followStats?.followingCount ?? 0}
                  </div>
                  <div className="text-sm text-gray-600">Following</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My Invitations */}
          {(isLoadingInvitations || invitations.length > 0) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <span>My Invitations</span>
                  </div>
                  {invitations.filter((i: any) => i.status === 'pending').length > 0 && (
                    <Badge className="bg-yellow-500 text-white hover:bg-yellow-500">
                      {invitations.filter((i: any) => i.status === 'pending').length} pending
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingInvitations ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-walkable-cyan" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invitations.map((invitation: any) => (
                      <div key={invitation.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {invitation.tour?.title || 'Unnamed tour'}
                          </h4>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>Invited by <span className="font-medium">{invitation.invitedBy?.username || 'Unknown'}</span></span>
                            <span className="flex items-center gap-0.5">
                              {invitation.role === 'editor' ? (
                                <><Crown className="h-3 w-3" /> Editor</>
                              ) : (
                                <><Eye className="h-3 w-3" /> Viewer</>
                              )}
                            </span>
                            {invitation.status !== 'pending' && (
                              <span className={`capitalize font-medium ${invitation.status === 'accepted' ? 'text-green-600' : 'text-red-600'}`}>
                                {invitation.status}
                              </span>
                            )}
                          </div>
                        </div>
                        {invitation.status === 'pending' && (
                          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white h-8"
                              onClick={() => respondInvitationMutation.mutate({ collaboratorId: invitation.id, status: 'accepted' })}
                              disabled={respondInvitationMutation.isPending}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-400 text-red-600 hover:bg-red-50 h-8"
                              onClick={() => respondInvitationMutation.mutate({ collaboratorId: invitation.id, status: 'declined' })}
                              disabled={respondInvitationMutation.isPending}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
        <DialogContent className="sm:max-w-[480px]">
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
              <div className="col-span-3">
                <Input
                  id="username"
                  value={editUsername}
                  onChange={(e) => {
                    setEditUsername(e.target.value);
                    if (formErrors.username) setFormErrors(prev => ({ ...prev, username: undefined }));
                  }}
                  className={formErrors.username ? 'border-red-500' : ''}
                />
                {formErrors.username && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.username}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <div className="col-span-3">
                <Input
                  id="email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => {
                    setEditEmail(e.target.value);
                    if (formErrors.email) setFormErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  className={formErrors.email ? 'border-red-500' : ''}
                />
                {formErrors.email && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">
                Location
              </Label>
              <div className="col-span-3">
                <Input
                  id="location"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="bio" className="text-right pt-2">
                Bio
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="bio"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell others about yourself..."
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{editBio.length}/500</p>
              </div>
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
