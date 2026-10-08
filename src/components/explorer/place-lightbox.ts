import { lockPageScroll } from "@/lib/page-scroll-lock";
import type PhotoSwipe from "photoswipe";
import {
  galleryItems,
  validDimensions,
  type ShowcaseItem,
  type MediaDimensions,
} from "@/lib/place-gallery";
import { galleryHistory } from "@/lib/gallery-history";

let library: Promise<typeof import("photoswipe")> | undefined;
export function warmGallery() {
  library ??= Promise.all([
    import("photoswipe"),
    import("photoswipe/style.css"),
    import("./place-lightbox.css"),
  ])
    .then(([module]) => module)
    .catch((error) => {
      library = undefined;
      throw error;
    });
  return library;
}

async function measure(image: HTMLImageElement): Promise<MediaDimensions> {
  if (!image.complete) {
    image.loading = "eager";
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        image.removeEventListener("load", loaded);
        image.removeEventListener("error", failed);
        window.clearTimeout(timer);
      };
      const loaded = () => {
        cleanup();
        resolve();
      };
      const failed = () => {
        cleanup();
        reject(new Error("Thumbnail unavailable"));
      };
      const timer = window.setTimeout(failed, 15000);
      image.addEventListener("load", loaded, { once: true });
      image.addEventListener("error", failed, { once: true });
      if (image.complete) {
        if (image.naturalWidth) loaded();
        else failed();
      }
    });
  }
  const size = { width: image.naturalWidth, height: image.naturalHeight };
  if (!validDimensions(size))
    throw new Error("Thumbnail dimensions unavailable");
  return size;
}

type OpenGallery = {
  items: ShowcaseItem[];
  index: number;
  trigger: HTMLElement;
  root: HTMLElement;
  title: string;
  rtl: boolean;
  t: (key: string) => string;
  cancelled: () => boolean;
};

export async function openGallery({
  items,
  index,
  trigger,
  root,
  title,
  rtl,
  t,
  cancelled,
}: OpenGallery) {
  const { default: Gallery } = await warmGallery();
  const measured: Record<number, MediaDimensions> = {};
  const thumbnails = items.map((item, itemIndex) =>
    root.querySelector<HTMLImageElement>(
      `[data-gallery-index="${itemIndex}"] picture img, [data-gallery-index="${itemIndex}"] > img`,
    ),
  );
  await Promise.all(
    galleryItems(items).map(async (item, itemIndex) => {
      if (item.type !== "image" || validDimensions(item)) return;
      let thumbnail = thumbnails[itemIndex];
      if (!thumbnail) {
        thumbnail = new Image();
        thumbnail.src = item.msrc ?? item.src ?? "";
      }
      measured[itemIndex] = await measure(thumbnail);
    }),
  );
  if (cancelled()) return null;
  const source = galleryItems(
    items,
    measured,
    window.innerWidth < 640 ? 960 : 1600,
  ).map((item, itemIndex) => {
    const thumbnail = thumbnails[itemIndex];
    const element =
      itemIndex === index
        ? trigger
        : (thumbnail?.closest<HTMLElement>("[data-gallery-index]") ??
          undefined);
    return {
      ...item,
      type: item.type === "video" ? "html" : "image",
      html: undefined,
      logicalIndex: itemIndex,
      element,
      msrc: thumbnail?.currentSrc || item.msrc,
      thumbCropped: thumbnail
        ? getComputedStyle(thumbnail).objectFit === "cover"
        : false,
    };
  });
  if (rtl) source.reverse();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gallery: PhotoSwipe = new Gallery({
    dataSource: source,
    index: rtl ? items.length - 1 - index : index,
    mainClass: "khg-photoswipe",
    bgOpacity: 1,
    loop: false,
    preload: [1, 2],
    showHideAnimationType: reduced ? "fade" : "zoom",
    showAnimationDuration: reduced ? 100 : 250,
    hideAnimationDuration: reduced ? 100 : 250,
    zoomAnimationDuration: reduced ? 0 : 250,
    pinchToClose: true,
    closeOnVerticalDrag: true,
    allowPanToNext: true,
    escKey: true,
    arrowKeys: true,
    arrowPrev: true,
    arrowNext: true,
    close: true,
    zoom: true,
    trapFocus: true,
    returnFocus: false,
    counter: false,
    thumbSelector: "picture img, img:not([aria-hidden])",
    doubleTapAction: "zoom",
    imageClickAction: "zoom-or-close",
    tapAction: "toggle-controls",
    closeTitle: t("common.close"),
    zoomTitle: t("gallery.zoom"),
    arrowPrevTitle: t(rtl ? "gallery.next" : "gallery.previous"),
    arrowNextTitle: t(rtl ? "gallery.previous" : "gallery.next"),
    errorMsg: t("gallery.unavailable"),
    padding: { top: 64, bottom: 96, left: 16, right: 16 },
  });
  const navigation = galleryHistory(window, () => gallery.close());
  const releaseScroll = lockPageScroll();
  trigger.focus({ preventScroll: true });
  gallery.on("uiRegister", () => {
    gallery.ui?.registerElement({
      name: "caption",
      appendTo: "root",
      onInit(element) {
        element.textContent = title;
        element.dir = rtl ? "rtl" : "ltr";
      },
    });
    gallery.ui?.registerElement({
      name: "logical-counter",
      appendTo: "bar",
      order: 5,
      onInit(element) {
        element.dir = "ltr";
        element.setAttribute("aria-live", "polite");
        const update = () => {
          element.textContent = `${source[gallery.currIndex].logicalIndex + 1} / ${items.length}`;
        };
        gallery.on("change", update);
        update();
      },
    });
  });
  gallery.on("contentLoad", (event) => {
    const { content } = event;
    if (content.data.type !== "html") return;
    event.preventDefault();
    const holder = document.createElement("div");
    holder.className = "khg-gallery-video";
    const video = document.createElement("video");
    video.src = content.data.videoUrl;
    if (content.data.poster) video.poster = content.data.poster;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-label", content.data.alt || title);
    holder.append(video);
    content.element = holder;
  });
  gallery.on("contentResize", (event) => {
    if (event.content.data.type !== "html") return;
    event.preventDefault();
    if (event.content.element) {
      event.content.element.style.width = `${event.width}px`;
      event.content.element.style.height = `${event.height}px`;
    }
  });
  gallery.on("pointerDown", (event) => {
    if ((event.originalEvent.target as HTMLElement)?.closest("video"))
      event.preventDefault();
  });
  gallery.on("tapAction", (event) => {
    if ((event.originalEvent.target as HTMLElement)?.closest("video"))
      event.preventDefault();
  });
  gallery.on("doubleTapAction", (event) => {
    if ((event.originalEvent.target as HTMLElement)?.closest("video"))
      event.preventDefault();
  });
  const pause = (content: { element?: HTMLElement }) =>
    content.element?.querySelector("video")?.pause();
  gallery.on("contentDeactivate", ({ content }) => pause(content));
  gallery.on("contentActivate", ({ content }) => {
    const video = content.element?.querySelector("video");
    if (video) void video.play().catch(() => {});
  });
  gallery.on("contentRemove", ({ content }) => pause(content));
  gallery.on("close", () => {
    gallery.element
      ?.querySelectorAll("video")
      .forEach((video) => video.pause());
    navigation.close();
    releaseScroll();
  });
  gallery.on("afterInit", () => {
    gallery.element?.setAttribute("aria-label", title);
    gallery.element?.setAttribute("dir", rtl ? "rtl" : "ltr");
    gallery.element?.focus();
  });
  gallery.on("destroy", () => {
    navigation.dispose();
    releaseScroll();
    if (trigger.isConnected) trigger.focus({ preventScroll: true });
  });
  try {
    navigation.open();
    gallery.init();
  } catch (error) {
    gallery.destroy();
    throw error;
  }
  return gallery;
}
