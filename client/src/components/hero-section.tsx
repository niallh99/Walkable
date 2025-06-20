import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="pt-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Side - Hero Content */}
          <div className="space-y-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Discover Audio Walking Tours{" "}
              <span className="text-walkable-cyan">That Come to Life</span>
            </h1>
            <p className="text-xl text-walkable-gray leading-relaxed">
              Explore cities through immersive self-guided audio walking tours.
              Discover hidden stories, local culture, and fascinating history at
              your own pace.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/discover">
                <Button
                  size="lg"
                  className="bg-walkable-cyan hover:bg-walkable-cyan-dark text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Start Exploring Now
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-gray-300 text-walkable-gray hover:bg-gray-50 px-8 py-4 text-lg font-semibold transition-all"
              >
                Learn More
              </Button>
            </div>
          </div>
          
          {/* Right Side - Hero Image */}
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600"
              alt="City street perfect for walking tours"
              className="rounded-2xl shadow-2xl w-full h-auto"
            />
            <div className="absolute inset-0 bg-walkable-cyan bg-opacity-10 rounded-2xl"></div>

          </div>
        </div>
      </div>
    </section>
  );
}
