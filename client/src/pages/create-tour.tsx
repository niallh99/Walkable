import { Navbar } from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth-context";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function CreateTour() {
  const { user } = useAuth();

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
                    Please log in to create and share your own audio walking tours.
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Share Your Story
            </h1>
            <p className="text-xl text-walkable-gray">
              Create engaging audio walking tours and share your local knowledge with the world
            </p>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎙️</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Tour Creation Flow Coming Soon
                </h3>
                <p className="text-walkable-gray max-w-md mx-auto">
                  We're building an intuitive multi-step form that will let you create
                  amazing audio tours with map integration and audio uploads.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
