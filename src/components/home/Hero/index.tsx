'use client'
import { DrawCircleText } from "./components/DrawCircleText";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { useGlobalStore } from "@/store/useGlobalStore";

export default function Hero() {
  const { marquebut, setmarquebut } = useGlobalStore();

  const handleclick = () => {
    setmarquebut(!marquebut);
  };

  return (
    <div className="flex items-center justify-center px-4">
      <div className="flex flex-col items-center justify-between lg:flex-row lg:space-y-0">
        <div className="flex items-center justify-end lg:w-[30%]">
          <div className="text-center lg:text-left">
            <DrawCircleText />
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="mb-4 text-5xl font-extrabold tracking-tight md:text-6xl">
                <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                  5argny
                </span>
              </h1>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Explore the Treasures of Egypt
              </h2>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
            >
              Discover carefully curated destinations, hidden gems, and iconic
              landmarks across Egypt with the nations most trusted exploration
              companion.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-10"
            >
              <Button
                size="lg"
                onClick={handleclick}
                className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-500 px-8 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              >
                <MapPin className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                Start Exploring Now
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
