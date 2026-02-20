import { useQuery } from '@tanstack/react-query';
import { Tour } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Star } from 'lucide-react';
import { Link } from 'wouter';

function formatTourPrice(tour: Tour): string {
  if (!tour.price || parseFloat(tour.price) === 0) return 'Free';
  const symbol = tour.currency === 'GBP' ? '£' : tour.currency === 'USD' ? '$' : '€';
  return `${symbol}${parseFloat(tour.price).toFixed(2)}`;
}

function isTourFree(tour: Tour): boolean {
  return !tour.price || parseFloat(tour.price) === 0;
}

export function FeaturedTours() {
  const { data: allTours = [], isLoading } = useQuery<Tour[]>({
    queryKey: ['/api/tours'],
  });

  // Randomly select 4 tours
  const featuredTours = allTours
    .sort(() => 0.5 - Math.random())
    .slice(0, 4);

  const getLocationImage = (title: string) => {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('amsterdam') || lowerTitle.includes('canal')) {
      return 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&h=300&fit=crop&crop=center';
    } else if (lowerTitle.includes('san francisco') || lowerTitle.includes('downtown')) {
      return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center';
    } else if (lowerTitle.includes('golden gate') || lowerTitle.includes('bridge')) {
      return 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop&crop=center';
    } else if (lowerTitle.includes('chinatown')) {
      return 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center';
    } else if (lowerTitle.includes('fisherman')) {
      return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center';
    } else if (lowerTitle.includes('beach')) {
      return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop&crop=center';
    } else if (lowerTitle.includes('art') || lowerTitle.includes('gallery')) {
      return 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center';
    } else if (lowerTitle.includes('park')) {
      return 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop&crop=center';
    } else if (lowerTitle.includes('food')) {
      return 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop&crop=center';
    } else {
      return 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=300&fit=crop&crop=center';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      history: 'bg-orange-100 text-orange-800',
      culture: 'bg-purple-100 text-purple-800',
      food: 'bg-red-100 text-red-800',
      nature: 'bg-green-100 text-green-800',
      architecture: 'bg-blue-100 text-blue-800',
      art: 'bg-pink-100 text-pink-800',
    };
    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Tours</h2>
            <p className="text-gray-600 text-lg">Loading featured tours...</p>
          </div>
        </div>
      </section>
    );
  }

  if (featuredTours.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Tours</h2>
          <p className="text-gray-600 text-lg">
            Discover popular walking tours created by our community of passionate local guides
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredTours.map((tour) => (
            <Link key={tour.id} href="/discover">
              <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <div className="relative">
                  <div className="aspect-[4/3] bg-gray-200 rounded-t-lg overflow-hidden">
                    {tour.coverImageUrl ? (
                      <img 
                        src={tour.coverImageUrl}
                        alt={tour.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = getLocationImage(tour.title);
                        }}
                      />
                    ) : (
                      <img 
                        src={getLocationImage(tour.title)}
                        alt={tour.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                  </div>
                  <div className="absolute top-3 left-3 flex gap-1.5">
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
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-1">
                    {tour.title}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <MapPin className="h-4 w-4 mr-1 text-walkable-cyan" />
                    <span className="line-clamp-1">
                      {tour.title.includes('San Francisco') ? 'San Francisco, CA' : 
                       tour.title.includes('Amsterdam') ? 'Amsterdam, NL' : 
                       tour.title.includes('Golden Gate') ? 'San Francisco, CA' :
                       tour.title.includes('Chinatown') ? 'San Francisco, CA' :
                       'City Location'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{tour.duration || 60} min</span>
                    </div>
                    {(tour as any).averageRating > 0 && (
                      <div className="flex items-center text-yellow-500">
                        <Star className="h-4 w-4 mr-1 fill-current" />
                        <span className="text-gray-600 font-medium">
                          {parseFloat((tour as any).averageRating).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        
        <div className="text-center mt-10">
          <Link href="/discover">
            <button className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white px-8 py-3 rounded-lg font-semibold transition-colors">
              View All Tours
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}