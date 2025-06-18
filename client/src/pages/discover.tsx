import { Navbar } from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";

export default function Discover() {
  return (
    <div className="min-h-screen bg-walkable-light-gray">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Explore Tours Near You
            </h1>
            <p className="text-xl text-walkable-gray">
              Discover amazing audio walking tours in your area
            </p>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🗺️</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Interactive Map Coming Soon
                </h3>
                <p className="text-walkable-gray max-w-md mx-auto">
                  We're working on an amazing interactive map experience with Leaflet.js
                  that will show you nearby tours and let you discover new adventures.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
