import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-context';
import { apiRequest } from '@/lib/queryClient';
import {
  BarChart3, Star, MessageSquare, MapPin, Edit2, Loader2,
  DollarSign, Eye, Play, CheckCircle2, TrendingUp, Clock,
  Volume2, CreditCard, AlertCircle,
} from 'lucide-react';

// ─── Stat card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'cyan' | 'rose';
  placeholder?: boolean;
}

function StatCard({ title, value, subtitle, icon: Icon, color, placeholder }: StatCardProps) {
  const styles: Record<string, { bg: string; icon: string; val: string }> = {
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500',   val: 'text-blue-700'   },
    green:  { bg: 'bg-green-50',  icon: 'text-green-500',  val: 'text-green-700'  },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500', val: 'text-purple-700' },
    yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-500', val: 'text-yellow-700' },
    cyan:   { bg: 'bg-cyan-50',   icon: 'text-cyan-500',   val: 'text-cyan-700'   },
    rose:   { bg: 'bg-rose-50',   icon: 'text-rose-500',   val: 'text-rose-700'   },
  };
  const c = styles[color];

  return (
    <Card className={placeholder ? 'opacity-60' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-gray-500 mb-1 truncate">{title}</p>
            <p className={`text-3xl font-bold ${c.val}`}>{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
            {placeholder && (
              <p className="text-xs text-gray-400 mt-1 italic">Analytics coming soon</p>
            )}
          </div>
          <div className={`${c.bg} p-3 rounded-xl flex-shrink-0`}>
            <Icon className={`h-6 w-6 ${c.icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Star display ─────────────────────────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${
            s <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();

  // ── Tours ──
  const { data: tours = [], isLoading: isLoadingTours } = useQuery<any[]>({
    queryKey: ['/api/users', user?.id, 'tours'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user!.id}/tours`);
      if (!res.ok) throw new Error('Failed to fetch tours');
      return res.json();
    },
    enabled: !!user?.id,
  });

  // ── Analytics overview (graceful failure) ──
  const { data: analytics } = useQuery<{
    totalViews?: number;
    totalPlays?: number;
    totalCompletions?: number;
    totalEarnings?: number;
  } | null>({
    queryKey: ['/api/analytics/overview'],
    queryFn: async () => {
      try {
        const res = await apiRequest('/api/analytics/overview');
        return res.json();
      } catch {
        return null;
      }
    },
    retry: false,
  });

  // ── Stripe status ──
  const { data: stripeStatus } = useQuery<{ connected: boolean; onboardingComplete?: boolean }>({
    queryKey: ['/api/stripe/connect/status'],
    queryFn: async () => {
      const res = await apiRequest('/api/stripe/connect/status');
      return res.json();
    },
    enabled: !!user,
  });

  // ── Computed reliable stats ──
  const totalReviews = tours.reduce((sum: number, t: any) => sum + (t.reviewCount ?? 0), 0);
  const ratedTours = tours.filter((t: any) => parseFloat(t.averageRating) > 0);
  const globalAvgRating =
    ratedTours.length > 0
      ? ratedTours.reduce((sum: number, t: any) => sum + parseFloat(t.averageRating), 0) /
        ratedTours.length
      : null;

  const formatEarnings = (amount: number) => `€${amount.toFixed(2)}`;

  // ── Not logged in ──
  if (!user) {
    return (
      <div className="min-h-screen bg-walkable-light-gray">
        <Navbar />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="text-center py-12">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-lg font-semibold mb-2">Login required</h3>
              <Link href="/login">
                <Button className="bg-walkable-cyan text-white mt-2">Login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Not a creator ──
  if (user.role !== 'creator') {
    return (
      <div className="min-h-screen bg-walkable-light-gray">
        <Navbar />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Creator access only</h3>
              <p className="text-gray-500 text-sm mb-4">
                Upgrade your account to creator to access the dashboard.
              </p>
              <Link href="/profile">
                <Button className="bg-walkable-cyan text-white">Go to Profile</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const hasAnalytics = analytics != null;

  return (
    <div className="min-h-screen bg-walkable-light-gray">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-walkable-cyan" />
                Creator Dashboard
              </h1>
              <p className="text-gray-500 mt-1">
                Performance overview for <span className="font-medium">{user.username}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {stripeStatus?.connected ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Payments active
                </Badge>
              ) : (
                <Link href="/profile">
                  <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50">
                    <CreditCard className="h-3 w-3 mr-1" />
                    Set up payments
                  </Button>
                </Link>
              )}
              <Link href="/create-tour">
                <Button className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white" size="sm">
                  + New Tour
                </Button>
              </Link>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Views"
              value={hasAnalytics && analytics!.totalViews != null ? analytics!.totalViews.toLocaleString() : '—'}
              icon={Eye}
              color="blue"
              placeholder={!hasAnalytics}
            />
            <StatCard
              title="Total Plays"
              value={hasAnalytics && analytics!.totalPlays != null ? analytics!.totalPlays.toLocaleString() : '—'}
              icon={Play}
              color="cyan"
              placeholder={!hasAnalytics}
            />
            <StatCard
              title="Completions"
              value={hasAnalytics && analytics!.totalCompletions != null ? analytics!.totalCompletions.toLocaleString() : '—'}
              icon={CheckCircle2}
              color="green"
              placeholder={!hasAnalytics}
            />
            <StatCard
              title="Total Earnings"
              value={
                hasAnalytics && analytics!.totalEarnings != null
                  ? formatEarnings(analytics!.totalEarnings)
                  : stripeStatus?.connected
                  ? '—'
                  : '—'
              }
              subtitle={!stripeStatus?.connected ? 'Payments not set up' : undefined}
              icon={DollarSign}
              color="rose"
              placeholder={!hasAnalytics}
            />
          </div>

          {/* Secondary computed stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatCard
              title="Tours Created"
              value={tours.length}
              icon={MapPin}
              color="purple"
            />
            <StatCard
              title="Total Reviews"
              value={totalReviews}
              icon={MessageSquare}
              color="yellow"
            />
            <StatCard
              title="Avg Rating"
              value={globalAvgRating != null ? globalAvgRating.toFixed(1) : '—'}
              subtitle={globalAvgRating != null ? `across ${ratedTours.length} tours` : 'No reviews yet'}
              icon={Star}
              color="yellow"
            />
          </div>

          {/* Analytics unavailable notice */}
          {!hasAnalytics && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-8 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Detailed analytics (views, plays, completions, earnings) are not yet available.
                The cards above will populate automatically once the analytics endpoints go live.
              </span>
            </div>
          )}

          {/* Tour performance table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-walkable-cyan" />
                Tour Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTours ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-walkable-cyan" />
                </div>
              ) : tours.length === 0 ? (
                <div className="text-center py-12">
                  <Volume2 className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No tours yet.</p>
                  <Link href="/create-tour">
                    <Button className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white">
                      Create your first tour
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-3 font-medium text-gray-600 whitespace-nowrap">Tour</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600 whitespace-nowrap">Category</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600 whitespace-nowrap">Price</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600 whitespace-nowrap">Reviews</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600 whitespace-nowrap">Rating</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600 whitespace-nowrap">Duration</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600 whitespace-nowrap">Created</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600 whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tours.map((tour: any) => {
                        const rating = parseFloat(tour.averageRating);
                        const price = parseFloat(tour.price ?? '0');
                        const symbol =
                          tour.currency === 'GBP' ? '£' : tour.currency === 'USD' ? '$' : '€';

                        return (
                          <tr key={tour.id} className="hover:bg-gray-50 transition-colors">
                            {/* Title + thumbnail */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                {tour.coverImageUrl ? (
                                  <img
                                    src={tour.coverImageUrl}
                                    alt={tour.title}
                                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-walkable-cyan rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Volume2 className="h-5 w-5 text-white" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 truncate max-w-[180px]">
                                    {tour.title}
                                  </p>
                                  <p className="text-xs text-gray-400 truncate max-w-[180px]">
                                    {tour.description}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Category */}
                            <td className="py-3 px-3">
                              <Badge variant="outline" className="capitalize text-xs">
                                {tour.category}
                              </Badge>
                            </td>

                            {/* Price */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {price > 0 ? (
                                <span className="font-medium text-green-700">
                                  {symbol}{price.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-gray-400">Free</span>
                              )}
                            </td>

                            {/* Review count */}
                            <td className="py-3 px-3">
                              <span className="flex items-center gap-1 text-gray-600">
                                <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                                {tour.reviewCount ?? 0}
                              </span>
                            </td>

                            {/* Rating */}
                            <td className="py-3 px-3">
                              {rating > 0 ? (
                                <StarRow rating={rating} />
                              ) : (
                                <span className="text-gray-400 text-xs">No reviews</span>
                              )}
                            </td>

                            {/* Duration */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="flex items-center gap-1 text-gray-600">
                                <Clock className="h-3.5 w-3.5 text-gray-400" />
                                {tour.duration ?? '—'} min
                              </span>
                            </td>

                            {/* Created */}
                            <td className="py-3 px-3 whitespace-nowrap text-gray-500">
                              {new Date(tour.createdAt).toLocaleDateString()}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <Link href={`/tour/${tour.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-gray-600 hover:text-walkable-cyan"
                                  >
                                    <Eye className="h-3.5 w-3.5 mr-1" />
                                    View
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-gray-600 hover:text-walkable-cyan"
                                  onClick={() => (window.location.href = `/create-tour?edit=${tour.id}`)}
                                >
                                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
