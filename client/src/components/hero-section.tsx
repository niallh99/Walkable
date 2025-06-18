import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="pt-16 bg-gradient-to-br from-walkable-light-gray to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Discover Audio Walking Tours{" "}
              <span className="text-walkable-cyan">That Come to Life</span>
            </h1>
            <p className="text-xl text-walkable-gray max-w-2xl">
              Explore cities through immersive self-guided audio walking tours.
              Discover hidden stories, local culture, and fascinating history at
              your own pace.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/discover">
                <Button
                  size="lg"
                  className="bg-walkable-cyan hover:bg-walkable-cyan text-white px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  Start Exploring Now
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-walkable-cyan text-walkable-cyan hover:bg-walkable-cyan hover:text-white px-8 py-4 text-lg transition-all"
              >
                Learn More
              </Button>
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600"
              alt="City street perfect for walking tours"
              className="rounded-2xl shadow-2xl w-full h-auto"
            />
            <div className="absolute inset-0 bg-walkable-cyan bg-opacity-20 rounded-2xl"></div>
            <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-walkable-cyan rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-800">
                  Live Audio Tour Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
