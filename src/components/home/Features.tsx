"use client";
import React, { ReactNode, useEffect } from "react";
import { motion } from "framer-motion";
import { CustomImage } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

// TranslateWrapper component for the marquee effect
interface TranslateWrapperProps {
  children: ReactNode;
  reverse?: boolean;
}

const TranslateWrapper: React.FC<TranslateWrapperProps> = ({
  children,
  reverse,
}) => (
  <motion.div
    initial={{ translateX: reverse ? "-100%" : "0%" }}
    animate={{ translateX: reverse ? "0%" : "-100%" }}
    transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
    className="flex gap-4 px-2"
  >
    {children}
  </motion.div>
);

// Place item component for the marquee
interface PlaceItemProps {
  uniqueId: string;
}

const PlaceItem: React.FC<PlaceItemProps> = ({ uniqueId }) => (
  <div className="group flex h-20 w-20 overflow-hidden rounded-lg shadow-md transition-transform hover:scale-105 hover:shadow-xl md:h-28 md:w-28">
    <CustomImage
      src={`https://img.heroui.chat/image/places?w=200&h=200&u=${uniqueId}`}
      alt={`Cultural place ${uniqueId}`}
      className="h-full w-full"
      fill
      objectFit="cover"
    />
  </div>
);

const PlaceItemsTop: React.FC = () => (
  <>
    <PlaceItem uniqueId="ancient_temple_1" />
    <PlaceItem uniqueId="european_castle_1" />
    <PlaceItem uniqueId="asian_shrine_1" />
    <PlaceItem uniqueId="african_monument_1" />
    <PlaceItem uniqueId="american_landmark_1" />
    <PlaceItem uniqueId="middle_east_site_1" />
    <PlaceItem uniqueId="oceanic_location_1" />
    <PlaceItem uniqueId="ancient_ruins_1" />
    <PlaceItem uniqueId="historical_building_1" />
    <PlaceItem uniqueId="cultural_center_1" />
  </>
);

const PlaceItemsBottom: React.FC = () => (
  <>
    <PlaceItem uniqueId="ancient_temple_2" />
    <PlaceItem uniqueId="european_castle_2" />
    <PlaceItem uniqueId="asian_shrine_2" />
    <PlaceItem uniqueId="african_monument_2" />
    <PlaceItem uniqueId="american_landmark_2" />
    <PlaceItem uniqueId="middle_east_site_2" />
    <PlaceItem uniqueId="oceanic_location_2" />
    <PlaceItem uniqueId="ancient_ruins_2" />
    <PlaceItem uniqueId="historical_building_2" />
    <PlaceItem uniqueId="cultural_center_2" />
  </>
);

const PlaceMarquee: React.FC = () => (
  <section className="py-4">
    <div className="flex overflow-hidden">
      <TranslateWrapper>
        <PlaceItemsTop />
      </TranslateWrapper>
      <TranslateWrapper>
        <PlaceItemsTop />
      </TranslateWrapper>
      <TranslateWrapper>
        <PlaceItemsTop />
      </TranslateWrapper>
    </div>

    <div className="mt-6 flex overflow-hidden">
      <TranslateWrapper reverse>
        <PlaceItemsBottom />
      </TranslateWrapper>
      <TranslateWrapper reverse>
        <PlaceItemsBottom />
      </TranslateWrapper>
      <TranslateWrapper reverse>
        <PlaceItemsBottom />
      </TranslateWrapper>
    </div>
  </section>
);

// FeatureCard component
interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  delay: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  delay,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="flex flex-col items-center rounded-xl bg-card p-6 shadow-lg border"
  >
    <div className="mb-4 rounded-full bg-blue-100 p-3 text-blue-500 dark:bg-blue-900 dark:text-blue-300">
      <Icon icon={icon} width={24} height={24} />
    </div>
    <h3 className="mb-2 text-lg font-bold text-foreground">{title}</h3>
    <p className="text-center text-sm text-muted-foreground">
      {description}
    </p>
  </motion.div>
);

// Main F2 component inlining LogoHero
const Features = React.forwardRef<HTMLDivElement>((props, ref) => {
  // Inject custom CSS for slow pulse animation
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes pulse-slow {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      .animate-pulse-slow { animation: pulse-slow 3s infinite; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <main className="min-h-screen">
      <div className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          {/* Places Showcase */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-16"
          >
            <PlaceMarquee />
          </motion.div>

          {/* Features Section */}
          <div className="mt-20">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.5 }}
              className="mb-12 text-center text-3xl font-bold text-foreground"
            >
              Why Choose 5argny
            </motion.h2>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon="lucide:map"
                title="Expertly Curated"
                description="Every destination is carefully selected and verified by local travel experts"
                delay={1.1}
              />
              <FeatureCard
                icon="lucide:thumbs-up"
                title="User Recommended"
                description="Destinations ranked by traveler ratings and authentic experiences"
                delay={1.3}
              />
              <FeatureCard
                icon="lucide:compass"
                title="Adventure Ready"
                description="Detailed information and guides to make your journey smooth and enjoyable"
                delay={1.5}
              />
            </div>
          </div>

          {/* CTA Section */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="mt-24 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 p-8 text-white shadow-lg sm:p-12 transition-transform hover:scale-[1.02] cursor-default"
          >
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="text-center md:text-left">
                <h3 className="mb-2 text-2xl font-bold sm:text-3xl">
                  Your Egyptian Adventure Awaits
                </h3>
                <p className="text-white/80">
                  Get 5argny on your device or use our web version to discover Egypt like never before
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Button
                  variant="default"
                  size="lg"
                  className="w-full sm:w-auto bg-white text-gray-900 hover:bg-gray-100"
                >
                  <Icon icon="logos:apple" width={20} height={20} className="mr-2" />
                  App Store
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  asChild
                  className="w-full sm:w-auto bg-white text-gray-900 hover:bg-gray-100"
                >
                  <a
                    href="https://play.google.com/store/apps/details?id=com.khargny.app"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon
                      icon="logos:google-play-icon"
                      width={20}
                      height={20}
                      className="mr-2"
                    />
                    Google Play
                  </a>
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  asChild
                  className="w-full sm:w-auto bg-white text-gray-900 hover:bg-gray-100"
                >
                  <a
                    href="/explorer"
                  >
                    <Icon icon="lucide:globe" width={20} height={20} className="mr-2" />
                    Web version 5argny
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
});

Features.displayName = 'Features';

export default Features;