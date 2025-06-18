import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth-context";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { User, MapPin, Clock } from "lucide-react";

export default function Profile() {
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Info */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Profile</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-walkable-cyan rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {user.username}
                    </h3>
                    <p className="text-walkable-gray text-sm mb-4">{user.email}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-walkable-cyan text-walkable-cyan"
                    >
                      Edit Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tours and Activity */}
            <div className="lg:col-span-2 space-y-6">
              {/* Created Tours */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>My Tours</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🎯</div>
                    <h4 className="font-medium text-gray-900 mb-2">No tours created yet</h4>
                    <p className="text-walkable-gray text-sm mb-4">
                      Share your local knowledge by creating your first audio tour
                    </p>
                    <Link href="/create-tour">
                      <Button className="bg-walkable-cyan hover:bg-walkable-cyan text-white">
                        Create Your First Tour
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Completed Tours */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Completed Tours</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🚶‍♂️</div>
                    <h4 className="font-medium text-gray-900 mb-2">No tours completed yet</h4>
                    <p className="text-walkable-gray text-sm mb-4">
                      Start exploring amazing audio tours in your area
                    </p>
                    <Link href="/discover">
                      <Button className="bg-walkable-cyan hover:bg-walkable-cyan text-white">
                        Discover Tours
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
