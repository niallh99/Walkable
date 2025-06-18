import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="pt-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center space-y-8">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight max-w-5xl mx-auto">
            Discover Audio Walking Tours{" "}
            <span className="text-walkable-cyan">That Come to Life</span>
          </h1>
          <p className="text-xl md:text-2xl text-walkable-gray max-w-4xl mx-auto leading-relaxed">
            Explore cities through immersive self-guided audio walking tours.
            Discover hidden stories, local culture, and fascinating history at
            your own pace.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
            <Link href="/discover">
              <Button
                size="lg"
                className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white px-12 py-6 text-xl font-semibold shadow-lg hover:shadow-xl transition-all rounded-lg"
              >
                Start Exploring Now
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-gray-300 text-walkable-gray hover:bg-gray-50 px-12 py-6 text-xl font-semibold transition-all rounded-lg"
            >
              Learn More
            </Button>
          </div>
        </div>
        
        {/* Hero Image Section */}
        <div className="mt-20 relative">
          <img
            src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=600"
            alt="City street perfect for walking tours"
            className="rounded-2xl shadow-2xl w-full h-auto max-w-4xl mx-auto"
          />
          <div className="absolute inset-0 bg-walkable-cyan bg-opacity-10 rounded-2xl max-w-4xl mx-auto"></div>
          <div className="absolute bottom-6 left-6 bg-white bg-opacity-95 backdrop-blur-sm rounded-xl p-4 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-walkable-cyan rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-800">
                Live Audio Tour Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
