import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth-context';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  MapPin, Clock, Volume2, Calendar, Sparkles,
  UserPlus, UserMinus, Loader2,
} from 'lucide-react';

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isOwnProfile = user?.id === parseInt(id);

  const { data: profile, isLoading: isLoadingProfile } = useQuery<any>({
    queryKey: [`/api/users/${id}`],
    queryFn: async () => {
      const res = await apiRequest(`/api/users/${id}`);
      return res.json();
    },
  });

  const { data: tours = [], isLoading: isLoadingTours } = useQuery<any[]>({
    queryKey: ['/api/users', id, 'tours'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${id}/tours`);
      if (!res.ok) throw new Error('Failed to fetch tours');
      return res.json();
    },
  });

  const { data: followStats, isLoading: isLoadingStats } = useQuery<{
    followerCount: number;
    followingCount: number;
    isFollowing: boolean;
  }>({
    queryKey: [`/api/users/${id}/follow-stats`],
    queryFn: async () => {
      const res = await apiRequest(`/api/users/${id}/follow-stats`);
      return res.json();
    },
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/users/${id}/follow`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${id}/follow-stats`] });
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      toast({ title: `Following @${profile?.username}` });
    },
    onError: (error: any) => {
      toast({ title: 'Could not follow', description: error.message, variant: 'destructive' });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/users/${id}/follow`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${id}/follow-stats`] });
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      toast({ title: `Unfollowed @${profile?.username}` });
    },
    onError: (error: any) => {
      toast({ title: 'Could not unfollow', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-walkable-light-gray">
        <Navbar />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-walkable-cyan" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-walkable-light-gray">
        <Navbar />
        <div className="pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4">
            <Card>
              <CardContent className="text-center py-16">
                <div className="text-4xl mb-4">👤</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">User not found</h3>
                <p className="text-gray-500">This profile doesn't exist or has been removed.</p>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const followerCount = followStats?.followerCount ?? 0;
  const followingCount = followStats?.followingCount ?? 0;
  const isFollowing = followStats?.isFollowing ?? false;
  const isMutating = followMutation.isPending || unfollowMutation.isPending;

  return (
    <div className="min-h-screen bg-walkable-light-gray">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Profile Card */}
          <Card className="mb-6">
            <CardContent className="pt-8 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-6">

                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-gradient-to-br from-walkable-cyan to-cyan-600 rounded-full flex items-center justify-center overflow-hidden">
                    {profile.profileImage ? (
                      <img
                        src={profile.profileImage}
                        alt={profile.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-3xl font-bold">
                        {profile.username?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info & actions */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">{profile.username}</h1>
                      {profile.location && (
                        <div className="flex items-center text-gray-500 mt-1">
                          <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="text-sm">{profile.location}</span>
                        </div>
                      )}
                      {profile.role === 'creator' && (
                        <Badge className="mt-2 bg-blue-100 text-blue-800 hover:bg-blue-100">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Creator
                        </Badge>
                      )}
                      {profile.bio && (
                        <p className="text-gray-700 mt-3 text-sm leading-relaxed max-w-md">{profile.bio}</p>
                      )}
                    </div>

                    {/* Follow / edit button */}
                    {isOwnProfile ? (
                      <Link href="/profile">
                        <Button variant="outline" className="border-walkable-cyan text-walkable-cyan hover:bg-walkable-cyan hover:text-white flex-shrink-0">
                          Edit Profile
                        </Button>
                      </Link>
                    ) : user && (
                      isFollowing ? (
                        <Button
                          variant="outline"
                          className="border-gray-300 text-gray-700 hover:border-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                          onClick={() => unfollowMutation.mutate()}
                          disabled={isMutating || isLoadingStats}
                        >
                          {unfollowMutation.isPending
                            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            : <UserMinus className="h-4 w-4 mr-2" />
                          }
                          Unfollow
                        </Button>
                      ) : (
                        <Button
                          className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white flex-shrink-0"
                          onClick={() => followMutation.mutate()}
                          disabled={isMutating || isLoadingStats}
                        >
                          {followMutation.isPending
                            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            : <UserPlus className="h-4 w-4 mr-2" />
                          }
                          Follow
                        </Button>
                      )
                    )}
                  </div>

                  {/* Counts */}
                  <div className="flex gap-6 mt-5">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">
                        {isLoadingStats ? '–' : followerCount}
                      </div>
                      <div className="text-xs text-gray-500">Followers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">
                        {isLoadingStats ? '–' : followingCount}
                      </div>
                      <div className="text-xs text-gray-500">Following</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">{tours.length}</div>
                      <div className="text-xs text-gray-500">Tours</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tours list */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Tours by {profile.username}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTours ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-walkable-cyan" />
                </div>
              ) : tours.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-3">🎧</div>
                  <p>No tours published yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tours.map((tour: any) => (
                    <Link key={tour.id} href={`/tour/${tour.id}`}>
                      <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-walkable-cyan hover:bg-gray-50 transition-colors cursor-pointer">
                        {tour.coverImageUrl ? (
                          <img
                            src={tour.coverImageUrl}
                            alt={tour.title}
                            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-walkable-cyan rounded-lg flex items-center justify-center flex-shrink-0">
                            <Volume2 className="h-6 w-6 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{tour.title}</h4>
                          <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{tour.description}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{tour.category}</Badge>
                            {tour.duration && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {tour.duration} min
                              </span>
                            )}
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(tour.createdAt).toLocaleDateString()}
                            </span>
                            {parseFloat(tour.price) > 0 ? (
                              <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
                                {tour.currency} {parseFloat(tour.price).toFixed(2)}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-400">
                                Free
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
      <Footer />
    </div>
  );
}
