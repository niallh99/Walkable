import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { HeroSection } from "@/components/hero-section";
import { FeaturesSection } from "@/components/features-section";
import walkableLogo from "@assets/Walkable logo_1750231371495.png";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      
      {/* Footer */}
      <footer className="bg-walkable-cyan text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <img 
                src={walkableLogo} 
                alt="Walkable" 
                className="h-12 w-auto mb-4"
              />
              <p className="text-white/80 mb-6 max-w-md">
                Discover cities through immersive self-guided audio walking
                tours. Explore hidden stories, local culture, and fascinating
                history at your own pace.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4 text-white">Explore</h3>
              <ul className="space-y-3 text-white/70">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Browse Tours
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Popular Destinations
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    New Releases
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Categories
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4 text-white">Create</h3>
              <ul className="space-y-3 text-white/70">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Creator Guide
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Upload Tour
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Recording Tips
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Community
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-white/70 text-sm">
              © 2024 Walkable. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a
                href="#"
                className="text-white/70 hover:text-white text-sm transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-white/70 hover:text-white text-sm transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="#"
                className="text-white/70 hover:text-white text-sm transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
