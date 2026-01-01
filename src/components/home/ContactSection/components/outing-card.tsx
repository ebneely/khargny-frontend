import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomImage } from "@/components/ui/image";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { Outing } from "@/types";
import { Clock, X, MapPin, Star } from "lucide-react";

interface OutingCardProps {
  outing: Outing;
  onClick: (outing: Outing) => void;
}

export const OutingCard: React.FC<OutingCardProps> = ({ outing, onClick }) => {
  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={() => onClick(outing)}
    >
      <Card className="group w-full cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary">
        <div className="relative h-40 sm:h-48 w-full overflow-hidden">
          <CustomImage
            alt={outing.title}
            className="h-full w-full transition-transform duration-500 group-hover:scale-110"
            src={outing.image}
            fill
            objectFit="cover"
          />
        </div>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <h3 className="line-clamp-1 text-base sm:text-lg font-semibold">
              {outing.title}
            </h3>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span>{outing.rating}</span>
              <span className="text-xs text-muted-foreground">
                ({outing.reviewCount})
              </span>
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {outing.area}, {outing.location}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Category: {outing.category}
          </p>
          <p className="mt-2 line-clamp-2 text-sm text-foreground">{outing.description}</p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 bg-muted/50 p-2 sm:p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2 sm:gap-0">
            <Badge
              variant={outing.open_now ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              {outing.open_now ? (
                <Clock className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              {outing.open_now ? "Open" : "Closed"}
            </Badge>
            <span className="text-xs sm:text-sm italic text-muted-foreground">
              Tap for more details
            </span>
          </div>
          {outing.url && (
            <motion.a
              href={outing.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="group/btn inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold overflow-hidden relative w-full min-h-[44px] [animation:gradient-shift_3s_linear_infinite] md:[animation:none]"
              style={{
                background: 'linear-gradient(90deg, #ff0080, #ff8c00, #40e0d0, #9370db, #ff0080)',
                backgroundSize: '400% 400%',
                color: '#ffffff',
              }}
              whileHover={{
                filter: 'hue-rotate(360deg)',
                boxShadow: '0 0 20px rgba(255, 0, 128, 0.5), 0 0 40px rgba(64, 224, 208, 0.3)',
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
              <MapPin className="h-4 w-4" />
              5ARGNY
            </motion.a>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};
