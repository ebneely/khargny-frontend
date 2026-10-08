"use client";

import * as React from "react";
import { Search, MapPin } from "lucide-react";
import { useI18n } from "@/i18n/LocaleProvider";
import { useSearchPlaces } from "@/lib/api/hooks/use-search";
import { useCategories } from "@/lib/api/hooks/use-categories";
import { useDebouncedSearch } from "@/lib/use-search-term";
import { matchReason, searchAddress, searchTerm } from "@/lib/place-search";
import { regionLabel } from "@/lib/egypt-regions";
import { PhotoImage } from "@/components/ds/PhotoImage";
import {
  nearestCity,
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
  const [example, setExample] = React.useState(0);
  const hasTyped = React.useRef(false);
  const geoPending = React.useRef(false);
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
    { q: debounced, limit: 6 },
    { enabled: open && settled, locale },
  );
  const { data: categories } = useCategories();
  const pick = (ar?: string | null, en?: string | null) =>
    (locale === "ar" ? ar || en : en || ar) || "";
  const cityHref = (city: City) =>
    `/${locale}/explorer/${encodeURIComponent(city.slug)}/`;
  const places =
    settled && !result.isPlaceholderData && !result.isError
      ? (result.data?.items ?? [])
      : [];
  const namedCities = cities.filter(
    (city) =>
      !input.trim() ||
      [city.name, city.nameEn].some((name) =>
        name?.toLocaleLowerCase().includes(input.trim().toLocaleLowerCase()),
      ),
  );
  const bestCity = bestSearchCity(cities, places, term);
  const allHref = searchAddress(
    bestCity ? cityHref(bestCity) : `/${locale}/explorer/`,
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
        ...places.slice(0, 6).flatMap((place) => {
          const city = cities.find(
            (candidate) => candidate.id === place.cityId,
          );
          if (!city) return [];
          const category = categories?.find(
            (candidate) => candidate.id === place.categoryId,
          );
          return [
            {
              key: place.id,
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
    setNearMe(Boolean(window.navigator.geolocation) && !denied);
    return () => {
      alive.current = false;
    };
  }, []);

  React.useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (hasTyped.current || preference.matches) return;
    const timer = window.setInterval(() => {
      if (!hasTyped.current) setExample((current) => (current + 1) % 3);
    }, 4500);
    const stop = () => {
      if (preference.matches) window.clearInterval(timer);
    };
    preference.addEventListener("change", stop);
    return () => {
      window.clearInterval(timer);
      preference.removeEventListener("change", stop);
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
  }, [input, debounced, result.data]);
  React.useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>(`[data-option-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  function remember() {
    if (term) setRecents(store.current.add(term));
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
    window.navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!alive.current) return;
        const city = nearestCity(
          cities,
          position.coords.latitude,
          position.coords.longitude,
        );
        geoPending.current = false;
        setLocating(false);
        if (city) window.location.assign(cityHref(city));
        else setGeoMessage(t("home.nearUnavailable"));
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
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  }

  return (
    <section className={styles.hero}>
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
          <div className={styles.field}>
            <Search size={20} aria-hidden="true" />
            <input
              ref={field}
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
              onChange={(event) => {
                hasTyped.current = true;
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
              type="button"
              aria-label={t("common.search")}
              onClick={() => {
                if (term) choose({ key: "all", label: "", href: allHref });
                else {
                  setOpen(true);
                  field.current?.focus();
                }
              }}
            >
              <Search size={18} aria-hidden="true" />
            </button>
          </div>
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
                        : t("home.searchResults")}
                </p>
              )}
              <div
                ref={list}
                id={listId}
                role="listbox"
                aria-label={t("home.searchResults")}
              >
                {options.map((option, index) => {
                  const contents = (
                    <>
                      {option.photo && (
                        <span className={styles.photo}>
                          <PhotoImage
                            photo={option.photo}
                            alt=""
                            frame="card"
                            sizes="48px"
                          />
                        </span>
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
                    <a
                      key={option.key}
                      {...props}
                      href={option.href}
                      onClick={() => {
                        remember();
                        setOpen(false);
                      }}
                    >
                      {contents}
                    </a>
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
        <nav
          className={`khg-home-rail ${styles.intents}`}
          aria-label={t("home.startExploring")}
        >
          {nearMe && (
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
            <a key={city.id} href={cityHref(city)}>
              {pick(city.name, city.nameEn)}
            </a>
          ))}
          {HOME_FUTURE_INTENT_CHIPS.map((chip) => (
            <a key={chip.key} href={chip.href}>
              {t(chip.key)}
            </a>
          ))}
        </nav>
        <span className="sr-only" role="status">
          {geoMessage}
        </span>
      </div>
    </section>
  );
}
