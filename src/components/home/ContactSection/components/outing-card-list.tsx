import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomImage } from "@/components/ui/image";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { Outing } from "@/types";
import { Clock, X, MapPin, Star } from "lucide-react";

interface OutingCardListProps {
  outing: Outing;
  onClick: (outing: Outing) => void;
}

export const OutingCardList: React.FC<OutingCardListProps> = ({ outing, onClick }) => {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={() => onClick(outing)}
      className="w-full"
    >
      <Card className="group w-full cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary h-full flex">
        <div className="flex gap-2 p-2 sm:gap-4 sm:p-2.5 w-full h-full">
          {/* Image - smaller and on the left */}
          <div className="relative h-28 w-28 sm:h-36 sm:w-36 flex-shrink-0 overflow-hidden rounded-lg">
            <CustomImage
              alt={outing.title}
              className="h-full w-full transition-transform duration-500 group-hover:scale-110"
              src={outing.image}
              fill
              objectFit="cover"
            />
          </div>

          {/* Content - takes remaining space */}
          <div className="flex flex-1 flex-col justify-between min-w-0">
            {/* Top section */}
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-1 text-sm font-semibold">
                  {outing.title}
                </h3>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs font-medium">{outing.rating}</span>
                </div>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                {outing.area}, {outing.location}
              </p>
            </div>

            {/* Bottom section */}
            <div className="flex items-center justify-between gap-2">
              <Badge
                variant={outing.open_now ? "default" : "secondary"}
                className="flex items-center gap-1 h-5 text-[10px] px-1.5"
              >
                {outing.open_now ? (
                  <Clock className="h-2.5 w-2.5" />
                ) : (
                  <X className="h-2.5 w-2.5" />
                )}
                {outing.open_now ? "Open" : "Closed"}
              </Badge>
              
              {outing.url && (
                <motion.a
                  href={outing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="group/btn inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold overflow-hidden relative [animation:gradient-shift_3s_linear_infinite] md:[animation:none]"
                  style={{
                    background: 'linear-gradient(90deg, #ff0080, #ff8c00, #40e0d0, #9370db, #ff0080)',
                    backgroundSize: '400% 400%',
                    color: '#ffffff',
                  }}
                  whileHover={{
                    filter: 'hue-rotate(360deg)',
                    boxShadow: '0 0 15px rgba(255, 0, 128, 0.4), 0 0 30px rgba(64, 224, 208, 0.2)',
                    scale: 1.05,
                  }}
                  transition={{
                    filter: {
                      duration: 5,
                      repeat: Infinity,
                      ease: 'linear',
                    },
                    boxShadow: {
                      duration: 0.3,
                    },
                    scale: {
                      duration: 0.3,
                    },
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <MapPin className="h-2.5 w-2.5" />
                  5ARGNY
                </motion.a>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
