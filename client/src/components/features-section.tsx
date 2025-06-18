import { MapPin, Mic, Clock } from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: MapPin,
      title: "Discover Nearby",
      description:
        "Find fascinating audio tours right around you using our interactive map and location-based discovery",
    },
    {
      icon: Mic,
      title: "Create & Share",
      description:
        "Share your local knowledge by creating immersive audio tours for others to discover and enjoy",
    },
    {
      icon: Clock,
      title: "Your Own Pace",
      description:
        "Experience tours at your own rhythm, pause anytime, and dive deeper into stories that captivate you",
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Choose Walkable?
          </h2>
          <p className="text-xl text-walkable-gray max-w-3xl mx-auto">
            Experience the world differently with our innovative audio walking
            tour platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-walkable-light-gray rounded-2xl p-8 text-center hover:shadow-lg transition-shadow"
            >
              <div className="w-16 h-16 bg-walkable-cyan rounded-full flex items-center justify-center mx-auto mb-6">
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {feature.title}
              </h3>
              <p className="text-walkable-gray">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
