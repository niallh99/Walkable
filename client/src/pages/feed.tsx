import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth-context';
import { apiRequest } from '@/lib/queryClient';
import { Volume2, Clock, Loader2, Rss, Users } from 'lucide-react';

export default function Feed() {
  const { user } = useAuth();

  const { data: tours = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/feed'],
    queryFn: async () => {
      const res = await apiRequest('/api/feed');
      return res.json();
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-walkable-light-gray">
        <Navbar />
        <div className="pt-24 pb-16">
          <div className="max-w-2xl mx-auto px-4">
            <Card>
              <CardContent className="text-center py-16">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Login to see your feed</h3>
                <p className="text-gray-500 mb-6">Follow creators to see their latest tours here.</p>
                <Link href="/login">
                  <Button className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white">Login</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-walkable-light-gray">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-6">
            <Rss className="h-6 w-6 text-walkable-cyan" />
            <h1 className="text-2xl font-bold text-gray-900">Your Feed</h1>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-walkable-cyan" />
            </div>
          ) : tours.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Your feed is empty</h3>
                <p className="text-gray-500 mb-6">
                  Follow some creators to see their newest tours right here.
                </p>
                <Link href="/discover">
                  <Button className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white">
                    Discover Creators
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tours.map((tour: any) => (
                <Link key={tour.id} href={`/tour/${tour.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {tour.coverImageUrl ? (
                          <img
                            src={tour.coverImageUrl}
                            alt={tour.title}
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-walkable-cyan rounded-lg flex items-center justify-center flex-shrink-0">
                            <Volume2 className="h-8 w-8 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {tour.creator && (
                            <Link
                              href={`/users/${tour.creatorId}`}
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            >
                              <p className="text-xs text-walkable-cyan font-medium mb-1 hover:underline">
                                @{tour.creator.username}
                              </p>
                            </Link>
                          )}
                          <h3 className="font-semibold text-gray-900 truncate">{tour.title}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{tour.description}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{tour.category}</Badge>
                            {tour.duration && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {tour.duration} min
                              </span>
                            )}
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
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
