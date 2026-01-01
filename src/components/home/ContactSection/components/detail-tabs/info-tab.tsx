import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { MapPin, Phone, Globe, Navigation } from "lucide-react";
import { motion } from "framer-motion";
import { Outing } from "@/types";

interface InfoTabProps {
  outing: Outing;
}

export const InfoTab: React.FC<InfoTabProps> = ({ outing }) => {
  return (
    <div className="grid gap-3 sm:gap-4 p-4 sm:p-6 md:p-8">
      {/* Location Card */}
      <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-500/10 p-2.5">
              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Location</h3>
              {outing.address && (
                <p className="text-sm text-muted-foreground mt-1">{outing.address}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About Card */}
      <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-purple-500/10 p-2.5">
              <Icon icon="lucide:file-text" className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">About</h3>
              <p className="text-sm text-foreground/80 mt-1 leading-relaxed line-clamp-3">{outing.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact & Links Card */}
      {(outing.formatted_phone_number ||
        outing.international_phone_number ||
        outing.website ||
        outing.url) && (
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-green-500/10 p-2.5">
                <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">Contact & Links</h3>
                
                {outing.formatted_phone_number && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start h-9 text-sm"
                    asChild
                  >
                    <a href={`tel:${outing.formatted_phone_number}`}>
                      <Phone className="h-4 w-4 mr-2" />
                      {outing.formatted_phone_number}
                    </a>
                  </Button>
                )}
                
                {outing.website && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start h-9 text-sm"
                    asChild
                  >
                    <a href={outing.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-2" />
                      Visit Website
                    </a>
                  </Button>
                )}
                
                {outing.url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start h-9 text-sm"
                    asChild
                  >
                    <a href={outing.url} target="_blank" rel="noopener noreferrer">
                      <Navigation className="h-4 w-4 mr-2" />
                      View on Google Maps
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accessibility & Services Card */}
      {(outing.wheelchair_accessible_entrance !== undefined ||
        outing.delivery !== undefined ||
        outing.dine_in !== undefined ||
        outing.takeout !== undefined ||
        outing.curbside_pickup !== undefined) && (
        <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50/50 to-transparent">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 text-orange-700">Accessibility & Services</h3>
            <div className="flex flex-wrap gap-2">
              {outing.wheelchair_accessible_entrance && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300 text-[10px] py-0 px-2">
                  <Icon
                    icon="lucide:wheelchair"
                    width={12}
                    height={12}
                  />
                  <span>Wheelchair</span>
                </Badge>
              )}
              {outing.delivery && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300 text-[10px] py-0 px-2">
                  <Icon
                    icon="lucide:package"
                    width={12}
                    height={12}
                  />
                  <span>Delivery</span>
                </Badge>
              )}
              {outing.dine_in && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300 text-[10px] py-0 px-2">
                  <Icon
                    icon="lucide:utensils"
                    width={12}
                    height={12}
                  />
                  <span>Dine-in</span>
                </Badge>
              )}
              {outing.takeout && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300 text-[10px] py-0 px-2">
                  <Icon
                    icon="lucide:shopping-bag"
                    width={12}
                    height={12}
                  />
                  <span>Takeout</span>
                </Badge>
              )}
              {outing.curbside_pickup && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300 text-[10px] py-0 px-2">
                  <Icon
                    icon="lucide:car"
                    width={12}
                    height={12}
                  />
                  <span>Curbside</span>
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
