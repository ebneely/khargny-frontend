import React from "react";
import { Icon } from "@iconify/react";
import { Outing } from "@/types";

interface HoursTabProps {
  outing: Outing;
}

export const HoursTab: React.FC<HoursTabProps> = ({ outing }) => {
  return (
    <div className="flex justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md space-y-2">
        {outing.weekday_text && outing.weekday_text.length > 0 && (
          <div className="rounded-lg border border-default-200 p-2">
            <h3 className="text-sm mb-2 flex items-center gap-1.5 font-semibold">
              <Icon
                icon="lucide:clock"
                className="text-primary"
                width={16}
                height={16}
              />
              Regular Hours
            </h3>
            <div className="grid grid-cols-1 divide-y divide-default-100 rounded-lg bg-default-50">
              {outing.weekday_text.map((day, index) => {
                const [dayName, hours] = day.split(": ");
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between px-2 py-1.5 text-sm"
                  >
                    <span className="font-medium">{dayName}</span>
                    <span className="text-default-600 text-xs">{hours}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
