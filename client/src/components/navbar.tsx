import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "./auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Menu, X } from "lucide-react";
import walkableLogo from "@assets/Walkable logo 2_1750512018721.png";

export function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu when route changes (handles browser back button)
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <nav className="bg-walkable-cyan shadow-lg fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/">
              <img 
                src={walkableLogo} 
                alt="Walkable" 
                className="h-10 w-auto cursor-pointer"
              />
            </Link>
          </div>

          {/* Desktop Navigation and Auth Buttons - All on Right */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Navigation Links */}
            <Link href="/">
              <span className={`text-white hover:text-gray-200 px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                location === "/" ? "border-b-2 border-white" : ""
              }`}>
                Home
              </span>
            </Link>
            <Link href="/discover">
              <span className={`text-white hover:text-gray-200 px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                location === "/discover" ? "border-b-2 border-white" : ""
              }`}>
                Discover
              </span>
            </Link>
            <Link href="/create-tour">
              <span className={`text-white hover:text-gray-200 px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                location === "/create-tour" ? "border-b-2 border-white" : ""
              }`}>
                Create
              </span>
            </Link>
            {user && (
              <Link href="/profile">
                <span className={`text-white hover:text-gray-200 px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  location === "/profile" ? "border-b-2 border-white" : ""
                }`}>
                  Profile
                </span>
              </Link>
            )}

            {/* Auth Buttons */}
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
              onClick={toggleMobileMenu}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-walkable-cyan border-t border-white/20">
            <div className="px-4 pt-2 pb-3 space-y-1">
              {/* Navigation Links */}
              <Link href="/">
                <span 
                  className={`block text-white hover:text-gray-200 px-3 py-2 text-base font-medium transition-colors cursor-pointer ${
                    location === "/" ? "bg-white/10 rounded-md" : ""
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </span>
              </Link>
              <Link href="/discover">
                <span 
                  className={`block text-white hover:text-gray-200 px-3 py-2 text-base font-medium transition-colors cursor-pointer ${
                    location === "/discover" ? "bg-white/10 rounded-md" : ""
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Discover
                </span>
              </Link>
              <Link href="/create-tour">
                <span 
                  className={`block text-white hover:text-gray-200 px-3 py-2 text-base font-medium transition-colors cursor-pointer ${
                    location === "/create-tour" ? "bg-white/10 rounded-md" : ""
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Create
                </span>
              </Link>
              {user && (
                <Link href="/profile">
                  <span 
                    className={`block text-white hover:text-gray-200 px-3 py-2 text-base font-medium transition-colors cursor-pointer ${
                      location === "/profile" ? "bg-white/10 rounded-md" : ""
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Profile
                  </span>
                </Link>
              )}
            </div>
            
            {/* Mobile Auth Section */}
            <div className="px-4 py-3 border-t border-white/20">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center text-white px-3 py-2">
                    <User className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">{user.username}</span>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-white hover:text-gray-200 hover:bg-white/10"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link href="/login">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-white hover:text-gray-200 hover:bg-white/10"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Login
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button 
                      className="w-full bg-white text-walkable-cyan hover:bg-gray-100"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
