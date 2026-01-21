/**
 * Opening Hours Utility
 *
 * Calculates whether a place is currently open based on Google Places API opening hours data.
 * This is a frontend implementation that matches the backend logic.
 */

type Period = {
  open: { day: number; time: string };
  close?: { day: number; time: string } | null;
};

type OpeningPeriod = {
  open?: { day: number; time: string } | null; // day: 0 = Sunday, time: "HHMM"
  close?: { day: number; time: string } | null; // may be null for 24/7
};

type OpeningHours = {
  periods?: OpeningPeriod[];
};

export type PlaceOpenStatus = {
  isOpen: boolean;
  closesAt: string | null;
  opensAt: { day: number; time: string } | null;
};

/**
 * Calculate place open status based on opening hours periods
 * Handles 24/7 places correctly (when close is null)
 */
export function getPlaceOpenStatus(
  periods: Period[],
  now = new Date()
): PlaceOpenStatus {
  if (!periods || periods.length === 0) {
    return {
      isOpen: false,
      closesAt: null,
      opensAt: null,
    };
  }

  const currentDay = now.getDay(); // 0-6 (0 = Sunday)
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  function toMinutes(time: string) {
    if (!time || time.length < 4) return 0;
    const h = parseInt(time.slice(0, 2));
    const m = parseInt(time.slice(2));
    return h * 60 + m;
  }

  // Helper function to check if a period is 24/7 (no close time)
  const isPeriod24_7 = (period: Period): boolean => {
    const closeIsNull = period.close === null;
    const closeIsUndefined = period.close === undefined;
    const closeIsFalsy = !period.close;
    const closeHasNullDay = period.close?.day === null;
    const closeHasNullTime = period.close?.time === null;
    const closeMissingDay = period.close && period.close.day === undefined;
    const closeMissingTime = period.close && period.close.time === undefined;
    
    return closeIsNull || 
           closeIsUndefined || 
           closeIsFalsy ||
           closeHasNullDay ||
           closeHasNullTime ||
           closeMissingDay ||
           closeMissingTime;
  };

  // Check if ALL periods are 24/7 (place is open 24/7 every day)
  const allPeriodsAre24_7 = periods.length > 0 && periods.every(isPeriod24_7);
  if (allPeriodsAre24_7) {
    return {
      isOpen: true,
      closesAt: null, // 24/7 - never closes
      opensAt: null,
    };
  }

  // Check for 24/7 on current day specifically
  for (const period of periods) {
    const openDay = period.open.day;
    
    // If this period is for the current day and has no close, it's 24/7
    if (openDay === currentDay && isPeriod24_7(period)) {
      return {
        isOpen: true,
        closesAt: null, // 24/7 - never closes
        opensAt: null,
      };
    }
  }

  // Then check regular hours
  for (const period of periods) {
    const openDay = period.open.day;
    const openTime = toMinutes(period.open.time);

    // Skip 24/7 periods (already handled above)
    if (isPeriod24_7(period)) {
      continue;
    }

    const closeDay = period.close!.day; // Non-null asserted after isPeriod24_7 check
    const closeTime = toMinutes(period.close!.time); // Non-null asserted

    // same day opening/closing
    if (openDay === closeDay && currentDay === openDay) {
      if (
        currentMinutes >= openTime &&
        currentMinutes < closeTime
      ) {
        return {
          isOpen: true,
          closesAt: period.close!.time,
          opensAt: null,
        };
      }
    }

    // overnight (e.g. 9 PM → 2 AM)
    if (openDay !== closeDay) {
      // open day (before midnight)
      if (
        currentDay === openDay &&
        currentMinutes >= openTime
      ) {
        return {
          isOpen: true,
          closesAt: period.close!.time,
          opensAt: null,
        };
      }

      // close day (after midnight)
      if (
        currentDay === closeDay &&
        currentMinutes < closeTime
      ) {
        return {
          isOpen: true,
          closesAt: period.close!.time,
          opensAt: null,
        };
      }
    }
  }

  // ❌ closed → find next opening
  let nextOpening: { day: number; time: string } | null = null;

  for (let i = 0; i < 7; i++) {
    const day = (currentDay + i) % 7;

    const p = periods.find(
      (x) => x.open.day === day
    );

    if (p) {
      nextOpening = p.open;
      break;
    }
  }

  return {
    isOpen: false,
    closesAt: null,
    opensAt: nextOpening,
  };
}

/**
 * Calculate open status from opening hours data (frontend version)
 * Converts OpeningPeriod[] format to Period[] and calculates status
 */
export function calculatePlaceOpenStatus(
  openingHours?: OpeningHours,
  now = new Date()
): PlaceOpenStatus | null {
  if (!openingHours?.periods?.length) {
    return null;
  }

  // Convert OpeningPeriod[] to Period[] format
  // Handle null/undefined close values correctly (24/7 places have null close)
  const periods: Period[] = openingHours.periods
    .filter((p): p is OpeningPeriod & { open: { day: number; time: string } } => {
      // Filter out periods without valid open time
      return !!p.open && 
             p.open !== null &&
             p.open.day !== undefined && 
             p.open.day !== null &&
             p.open.time !== undefined &&
             p.open.time !== null;
    })
    .map((p) => {
      // Handle both null and undefined for close (24/7 places)
      // A period is 24/7 if close is null, undefined, or missing day/time
      const closeIsNull = p.close === null || p.close === undefined;
      const closeHasInvalidDay = p.close && (p.close.day === null || p.close.day === undefined);
      const closeHasInvalidTime = p.close && (p.close.time === null || p.close.time === undefined);
      
      const hasValidClose = !closeIsNull && 
                            !closeHasInvalidDay && 
                            !closeHasInvalidTime &&
                            p.close!.day !== undefined && 
                            p.close!.time !== undefined;
      
      return {
        open: p.open!,
        close: hasValidClose ? p.close! : undefined, // undefined means 24/7
      };
    });

  if (periods.length === 0) {
    return null;
  }

  return getPlaceOpenStatus(periods, now);
}
