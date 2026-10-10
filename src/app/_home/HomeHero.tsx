"use client";

import * as React from "react";
import { Search, MapPin } from "lucide-react";
import { useI18n } from "@/i18n/LocaleProvider";
import { useSearchPlaces } from "@/lib/api/hooks/use-search";
import { useCategories } from "@/lib/api/hooks/use-categories";
import { apiRequest } from "@/lib/api/client";
import { SelectPill } from "@/components/explorer/SelectPill";
import { useDebouncedSearch } from "@/lib/use-search-term";
import { matchReason, searchAddress, searchTerm } from "@/lib/place-search";
import { regionLabel } from "@/lib/egypt-regions";
import { PhotoImage } from "@/components/ds/PhotoImage";
import { usePhotoLike } from '@/components/ds/usePhotoLike';
import { PlaceActions } from '@/components/ds/PlaceActions';
import { useSearchSignals } from '@/lib/use-search-signals';
import { trackSearchClick } from '@/lib/analytics/track';
import {
  detectNearbyLocation,
  detectedCityAddress,
  type DetectedLocation,
  recentSearches,
  moveHighlight,
  bestSearchCity,
  HOME_FUTURE_INTENT_CHIPS,
} from "@/lib/home-hero";
import type { City } from "@/lib/api/types";
import styles from "./HomeHero.module.css";

type Option = {
  key: string;
  label: string;
  href?: string;
  query?: string;
  detail?: string;
  reason?: string;
  photo?: string | null;
  placeId?: string;
  likeCount?: number;
  metrics?: { saves?: number; directions?: number; views?: number };
  position?: number;
};

export function HomeHero({ cities }: { cities: City[] }) {
  const { t, locale } = useI18n();
  const [input, setInput] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(-1);
  const [recents, setRecents] = React.useState<string[]>([]);
  const [nearMe, setNearMe] = React.useState(false);
  const [locating, setLocating] = React.useState(false);
  const [geoMessage, setGeoMessage] = React.useState("");
  const [detected, setDetected] = React.useState<DetectedLocation | null>(null);
  const [selectedCity, setSelectedCity] = React.useState<City | null>(null);
  const searchSignals = useSearchSignals(input, selectedCity?.id, locale);
  const [citySheetOpen, setCitySheetOpen] = React.useState(false);
  const [example, setExample] = React.useState(0);
  const hasTyped = React.useRef(false);
  const geoPending = React.useRef(false);
  const cityChoiceRestored = React.useRef(false);
  const alive = React.useRef(true);
  const root = React.useRef<HTMLDivElement>(null);
  const field = React.useRef<HTMLInputElement>(null);
  const list = React.useRef<HTMLDivElement>(null);
  const store = React.useRef(recentSearches());
  const listId = React.useId();
  const debounced = useDebouncedSearch(input);
  const term = searchTerm(input);
  const settled = Boolean(term) && debounced === term;
  const result = useSearchPlaces(
    { q: debounced, cityId: selectedCity?.id, limit: 6 },
    { enabled: open && settled, locale },
  );
  const { data: categories } = useCategories();
  const pick = React.useCallback((ar?: string | null, en?: string | null) =>
    (locale === "ar" ? ar || en : en || ar) || "", [locale]);
  const cityOptions = React.useMemo(() => {
    const available = selectedCity && !cities.some((city) => city.id === selectedCity.id)
      ? [selectedCity, ...cities]
      : cities;
    return available.map((city) => ({ value: city.id, label: pick(city.name, city.nameEn) }));
  }, [cities, selectedCity, pick]);
  const cityHref = (city: City) =>
    `/${locale}/explorer/${encodeURIComponent(city.slug)}/`;
  const places =
    settled && !result.isPlaceholderData && !result.isError
      ? (result.data?.items ?? []).filter((place) => !selectedCity || place.cityId === selectedCity.id)
      : [];
  const namedCities = cities.filter(
    (city) =>
      (!selectedCity || city.id === selectedCity.id) && (!input.trim() ||
      [city.name, city.nameEn].some((name) =>
        name?.toLocaleLowerCase().includes(input.trim().toLocaleLowerCase()),
      )),
  );
  const bestCity = selectedCity ? null : bestSearchCity(cities, places, term);
  const resultsLabel = selectedCity
    ? t("home.searchResultsIn", { city: pick(selectedCity.name, selectedCity.nameEn) })
    : t("home.searchResults");
  const allHref = searchAddress(
    selectedCity ? cityHref(selectedCity) : bestCity ? cityHref(bestCity) : `/${locale}/explorer/`,
    term,
  );
  const options: Option[] = !input.trim()
    ? [
        ...recents.map((query) => ({
          key: `recent-${query}`,
          label: query,
          query,
        })),
        ...cities.map((city) => ({
          key: city.id,
          label: pick(city.name, city.nameEn),
          href: cityHref(city),
        })),
      ]
    : [
        ...places.slice(0, 6).flatMap((place, index) => {
          const city = selectedCity ?? cities.find(
            (candidate) => candidate.id === place.cityId,
          );
          if (!city) return [];
          const category = categories?.find(
            (candidate) => candidate.id === place.categoryId,
          );
          return [
            {
              key: place.id,
              placeId: place.id,
              likeCount: place.likeCount,
              metrics: { saves: place.saveCount, directions: place.directionsCount, views: place.viewCount },
              position: index + 1,
              label: pick(place.name, place.nameEn),
              photo: place.coverImage,
              href: `${cityHref(city)}${encodeURIComponent(place.slug)}/`,
              detail: [
                category && pick(category.nameAr, category.nameEn),
                [
                  place.region && regionLabel(place.region, locale),
                  pick(city.name, city.nameEn),
                ]
                  .filter(Boolean)
                  .join(", "),
              ]
                .filter(Boolean)
                .join(" · "),
              reason: matchReason(place.matchedOn) || t("home.matchedName"),
            },
          ];
        }),
        ...namedCities.map((city) => ({
          key: city.id,
          label: pick(city.name, city.nameEn),
          detail: t("explorer.cities"),
          href: cityHref(city),
        })),
        ...(term
          ? [
              {
                key: "all",
                label: t("home.allResults", { query: input.trim() }),
                href: allHref,
              },
            ]
          : []),
      ];

  React.useEffect(() => {
    alive.current = true;
    try {
      store.current = recentSearches(window.localStorage);
    } catch {
      store.current = recentSearches();
    }
    setRecents(store.current.read());
    let denied = false;
    try {
      denied = window.localStorage.getItem("khg-geolocation-denied") === "true";
    } catch {}
    try {
      setNearMe(typeof window.navigator.geolocation?.getCurrentPosition === "function" && !denied);
    } catch {
      setNearMe(false);
    }
    return () => {
      alive.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (cityChoiceRestored.current) return;
    try {
      const savedCityId = window.sessionStorage.getItem("khg-home-city");
      const savedCity = cities.find((city) => city.id === savedCityId);
      if (savedCity) setSelectedCity(savedCity);
      if (!savedCityId || savedCity) cityChoiceRestored.current = true;
    } catch {
      cityChoiceRestored.current = true;
    }
  }, [cities]);

  React.useEffect(() => {
    let preference: MediaQueryList;
    try {
      if (typeof window.matchMedia !== "function") return;
      preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    } catch {
      return;
    }
    if (hasTyped.current || preference.matches) return;
    const timer = window.setInterval(() => {
      if (!hasTyped.current) setExample((current) => (current + 1) % 3);
    }, 4500);
    const stop = () => {
      if (preference.matches) window.clearInterval(timer);
    };
    preference.addEventListener?.("change", stop);
    return () => {
      window.clearInterval(timer);
      preference.removeEventListener?.("change", stop);
    };
  }, [input]);

  React.useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
        setHighlight(-1);
      }
    };
    window.document.addEventListener("pointerdown", dismiss);
    return () => window.document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  React.useEffect(() => {
    setHighlight(-1);
  }, [input, debounced, result.data, selectedCity?.id]);
  React.useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>(`[data-option-index="${highlight}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [highlight]);

  function remember() {
    searchSignals.settle();
    if (term) setRecents(store.current.add(term));
  }
  function recordClick(option: Option) {
    if (option.placeId && option.position && term) trackSearchClick(term, option.placeId, option.position, locale, selectedCity?.id);
  }
  function selectCity(city?: City) {
    cityChoiceRestored.current = true;
    setSelectedCity(city ?? null);
    setDetected(null);
    setGeoMessage("");
    setHighlight(-1);
    try {
      if (city) window.sessionStorage.setItem("khg-home-city", city.id);
      else window.sessionStorage.removeItem("khg-home-city");
    } catch {}
    if (input.trim()) {
      setOpen(true);
      field.current?.focus();
    }
  }
  function openCitySheet() {
    setOpen(false);
    setHighlight(-1);
    setCitySheetOpen(true);
  }
  function choose(option: Option) {
    if (option.query) {
      hasTyped.current = true;
      setInput(option.query);
      setOpen(true);
      setHighlight(-1);
      field.current?.focus();
    } else if (option.href) {
      remember();
      recordClick(option);
      setOpen(false);
      window.location.assign(option.href);
    }
  }
  function locate(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (geoPending.current) return;
    geoPending.current = true;
    setLocating(true);
    setGeoMessage("");
    setDetected(null);
    try {
      window.navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!alive.current) return;
          try {
            const location = await detectNearbyLocation(
              cities,
              position.coords.latitude,
              position.coords.longitude,
              (path, params) => apiRequest<unknown>("GET", path, {
                params: params as Record<string, string | number | string[] | undefined>,
                headers: { "Accept-Language": locale },
                signal: AbortSignal.timeout(10000),
              }),
            );
            if (!alive.current) return;
            setDetected(location);
            if (!location) setGeoMessage(t("home.nearNotFound"));
          } catch {
            if (alive.current) setGeoMessage(t("home.nearNotFound"));
          } finally {
            geoPending.current = false;
            if (alive.current) setLocating(false);
          }
        },
        (error) => {
          if (!alive.current) return;
          geoPending.current = false;
          setLocating(false);
          if (error.code === 1) {
            setNearMe(false);
            try {
              window.localStorage.setItem("khg-geolocation-denied", "true");
            } catch {}
          }
          setGeoMessage(
            t(error.code === 1 ? "home.nearDenied" : "home.nearUnavailable"),
          );
        },
        { enableHighAccuracy: false, maximumAge: 0, timeout: 10000 },
      );
    } catch {
      geoPending.current = false;
      setLocating(false);
      setGeoMessage(t("home.nearUnavailable"));
    }
  }

  return (
    <section className={styles.hero} dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className={styles.inner}>
        <h1 className={styles.title}>{t("home.heroTitle")}</h1>
        <p className={styles.description}>{t("home.heroSubtitle")}</p>
        <div
          ref={root}
          className={styles.searchRoot}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setOpen(false);
              setHighlight(-1);
            }
          }}
        >
          <form
            className={styles.field}
            action={selectedCity ? cityHref(selectedCity) : `/${locale}/explorer/`}
            method="get"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              if (term) choose({ key: "all", label: "", href: allHref });
              else {
                setOpen(true);
                field.current?.focus();
              }
            }}
          >
            <div className={styles.where}>
              <SelectPill
                options={cityOptions}
                value={selectedCity?.id ?? null}
                onChange={(id) => selectCity(selectedCity?.id === id ? selectedCity : cities.find((city) => city.id === id))}
                label={t("home.where")}
                placeholder={t("home.allEgypt")}
                allLabel={t("home.allEgypt")}
                emptyLabel={t("explorer.noCities")}
                icon={<MapPin size={16} />}
                searchPlaceholder={t("explorer.searchCities")}
                noMatchLabel={t("explorer.nothingMatches")}
                closeLabel={t("common.close")}
                open={citySheetOpen}
                onOpenChange={(next) => {
                  setCitySheetOpen(next);
                  if (next) setOpen(false);
                }}
              />
            </div>
            <input
              ref={field}
              name="q"
              role="combobox"
              aria-label={t("common.searchPlaces")}
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={open ? listId : undefined}
              aria-activedescendant={
                open && highlight >= 0 ? `${listId}-${highlight}` : undefined
              }
              value={input}
              placeholder={t(`home.searchExample${example + 1}`)}
              autoComplete="off"
              onFocus={() => setOpen(true)}
              onBlur={searchSignals.settle}
              onChange={(event) => {
                hasTyped.current = true;
                searchSignals.change(event.target.value);
                setInput(event.target.value);
                setOpen(true);
                setHighlight(-1);
              }}
              onKeyDown={(event) => {
                if (["ArrowDown", "ArrowUp"].includes(event.key)) {
                  event.preventDefault();
                  setOpen(true);
                  setHighlight(
                    moveHighlight(
                      open ? highlight : -1,
                      event.key,
                      options.length,
                    ),
                  );
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                  setHighlight(-1);
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  const option =
                    open && highlight >= 0
                      ? options[highlight]
                      : options.find((candidate) => candidate.key === "all");
                  if (option) choose(option);
                }
              }}
            />
            <button
              type="submit"
              aria-label={t("common.search")}
            >
              <Search size={18} aria-hidden="true" />
            </button>
          </form>
          {open && (
            <div className={styles.panel}>
              {!input.trim() && recents.length > 0 && (
                <div className={styles.panelHeading}>
                  <span>{t("home.recentSearches")}</span>
                  <button
                    type="button"
                    onClick={() => {
                      store.current.clear();
                      setRecents([]);
                      setHighlight(-1);
                      field.current?.focus();
                    }}
                  >
                    {t("home.clearRecents")}
                  </button>
                </div>
              )}
              {input.trim() && (
                <p className={styles.panelHeading} role="status">
                  {!term
                    ? t("home.typeMore")
                    : !settled || result.isFetching
                      ? t("common.loading")
                      : result.isError
                        ? t("home.searchFailed")
                        : resultsLabel}
                </p>
              )}
              <div
                ref={list}
                id={listId}
                role="listbox"
                aria-label={resultsLabel}
              >
                {options.map((option, index) => {
                  const contents = (
                    <>
                      {option.photo && (
                        <SuggestionPhoto photo={option.photo} placeId={option.placeId} />
                      )}
                      <span>
                        <span className={styles.optionName}>
                          {option.label}
                        </span>
                        {option.detail && <small>{option.detail}</small>}
                        {option.reason && (
                          <small className={styles.reason}>
                            {t("home.matchedReason", { reason: option.reason })}
                          </small>
                        )}
                      </span>
                    </>
                  );
                  const props = {
                    id: `${listId}-${index}`,
                    role: "option",
                    "aria-selected": index === highlight,
                    "data-option-index": index,
                    tabIndex: -1,
                    className: styles.option,
                    onMouseDown: (event: React.MouseEvent) =>
                      event.preventDefault(),
                    onPointerMove: () => setHighlight(index),
                  };
                  return option.href ? (
                    <div key={option.key} className={styles.resultRow}>
                    <a
                      {...props}
                      href={option.href}
                      data-search-result={option.placeId}
                      onAuxClick={(event) => { if (event.button === 1) { remember(); recordClick(option); } }}
                      onClick={() => {
                        remember();
                        recordClick(option);
                        setOpen(false);
                      }}
                    >
                      {contents}
                    </a>
                    {option.placeId && <div className={styles.resultActions} onMouseDown={(event) => event.preventDefault()}>
                      <PlaceActions placeId={option.placeId} name={option.label} likeCount={option.likeCount} metrics={option.metrics} />
                    </div>}
                    </div>
                  ) : (
                    <button
                      key={option.key}
                      {...props}
                      type="button"
                      onClick={() => choose(option)}
                    >
                      {contents}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {(detected || geoMessage) && (
          <div className={styles.confirmation}>
            <p role="status">
              {detected ? t("home.nearDetected", { location: [
                detected.region && regionLabel(detected.region, locale, detected.city.slug),
                pick(detected.city.name, detected.city.nameEn),
              ].filter(Boolean).join(locale === "ar" ? "، " : ", ") }) : geoMessage}
            </p>
            <div className={styles.confirmActions}>
              {detected && (
                <button type="button" className={styles.confirmPrimary} onClick={() => {
                  const address = detectedCityAddress(locale, detected);
                  selectCity(detected.city);
                  window.location.assign(address);
                }}>
                  {t("home.showCity", { city: pick(detected.city.name, detected.city.nameEn) })}
                </button>
              )}
              <button type="button" onClick={openCitySheet}>{t("home.chooseAnotherCity")}</button>
            </div>
          </div>
        )}
        <nav
          className={`khg-home-rail ${styles.intents}`}
          aria-label={t("home.startExploring")}
        >
          {nearMe && !detected && !geoMessage && (
            <a
              href={`/${locale}/explorer/`}
              onClick={locate}
              aria-disabled={locating}
            >
              <MapPin size={16} aria-hidden="true" />
              {t(locating ? "home.locating" : "home.nearMe")}
            </a>
          )}
          {cities.map((city) => (
            <a key={city.id} href={cityHref(city)} onClick={(event) => {
              if (!input.trim() || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              selectCity(city);
            }}>
              {pick(city.name, city.nameEn)}
            </a>
          ))}
          {HOME_FUTURE_INTENT_CHIPS.map((chip) => (
            <a key={chip.key} href={chip.href}>
              {t(chip.key)}
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}

function SuggestionPhoto({ photo, placeId }: { photo: string; placeId?: string }) {
  const interaction = usePhotoLike(placeId);
  return <span className={styles.photo} onPointerDown={interaction.onPointerDown} onPointerMove={interaction.onPointerMove} onPointerUp={interaction.onPointerUp} onPointerCancel={interaction.onPointerCancel}
    onClick={event => { const anchor = event.currentTarget.closest('a'); if (anchor) interaction.click(event, () => anchor.click()); }}>
    <PhotoImage photo={photo} alt="" frame="card" sizes="48px" />
  </span>;
}
