import { useQuery } from '@tanstack/react-query';
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-context";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function StripeConnectReturn() {
  const { user } = useAuth();

  const { data: stripeStatus, isLoading } = useQuery<{
    connected: boolean;
    accountId?: string;
    onboardingComplete?: boolean;
  }>({
    queryKey: ['/api/stripe/connect/status'],
    queryFn: async () => {
      const response = await apiRequest('/api/stripe/connect/status');
      return response.json();
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-walkable-light-gray">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="pt-8 pb-8">
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-walkable-cyan mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Verifying your account...
                  </h3>
                  <p className="text-gray-600">
                    Checking your Stripe Connect status.
                  </p>
                </div>
              ) : stripeStatus?.connected ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Payments Connected!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Your Stripe account is set up and ready to receive payments for your tours.
                  </p>
                  <Link href="/profile">
                    <Button className="bg-walkable-cyan hover:bg-walkable-cyan text-white">
                      Back to Profile
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Setup Incomplete
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Your Stripe account setup isn't complete yet. Please return to your profile to try again.
                  </p>
                  <Link href="/profile">
                    <Button className="bg-walkable-cyan hover:bg-walkable-cyan text-white">
                      Back to Profile
                    </Button>
                  </Link>
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
