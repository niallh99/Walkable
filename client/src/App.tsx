import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Discover from "@/pages/discover";
import CreateTourNew from "@/pages/create-tour-new";
import Profile from "@/pages/profile";
import PublicProfile from "@/pages/public-profile";
import Feed from "@/pages/feed";
import TourDetail from "@/pages/tour-detail";
import StripeConnectReturn from "@/pages/stripe-connect-return";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/discover" component={Discover} />
      <Route path="/create-tour" component={CreateTourNew} />
      <Route path="/profile" component={Profile} />
      <Route path="/users/:id" component={PublicProfile} />
      <Route path="/feed" component={Feed} />
      <Route path="/tour/:id" component={TourDetail} />
      <Route path="/stripe-connect/return" component={StripeConnectReturn} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
