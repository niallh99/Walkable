import { Link, useLocation } from "wouter";
import { useAuth } from "./auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Menu } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-walkable-cyan shadow-lg fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <img 
                  src="@assets/Walkable logo_1750159513045.png" 
                  alt="Walkable" 
                  className="h-8 w-auto"
                />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link href="/">
                <a
                  className={`text-white hover:text-gray-200 px-3 py-2 text-sm font-medium transition-colors ${
                    location === "/" ? "border-b-2 border-white" : ""
                  }`}
                >
                  Home
                </a>
              </Link>
              <Link href="/discover">
                <a
                  className={`text-white hover:text-gray-200 px-3 py-2 text-sm font-medium transition-colors ${
                    location === "/discover" ? "border-b-2 border-white" : ""
                  }`}
                >
                  Discover
                </a>
              </Link>
              <Link href="/create-tour">
                <a
                  className={`text-white hover:text-gray-200 px-3 py-2 text-sm font-medium transition-colors ${
                    location === "/create-tour" ? "border-b-2 border-white" : ""
                  }`}
                >
                  Create
                </a>
              </Link>
              {user && (
                <Link href="/profile">
                  <a
                    className={`text-white hover:text-gray-200 px-3 py-2 text-sm font-medium transition-colors ${
                      location === "/profile" ? "border-b-2 border-white" : ""
                    }`}
                  >
                    Profile
                  </a>
                </Link>
              )}
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-white hover:text-gray-200 hover:bg-white/10"
                  >
                    <User className="h-4 w-4 mr-2" />
                    {user.username}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="text-white hover:text-gray-200 hover:bg-white/10"
                  >
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-white text-walkable-cyan hover:bg-gray-100">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:text-gray-200 hover:bg-white/10"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
