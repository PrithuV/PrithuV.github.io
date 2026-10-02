"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/**
 * Inertial scrolling for the whole document. Lenis still scrolls the real page
 * — it only eases how fast `scrollY` catches up to the wheel — so the sticky
 * header and the anchor links keep working off it unchanged.
 *
 * Renders nothing; it exists for the effect.
 */
export function SmoothScroll() {
  useEffect(() => {
    /*
      Easing the page is motion the reader did not ask for, so with
      reduce-motion set the browser's own scrolling is left alone entirely.
    */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      /* Short enough to still feel like a direct response to the wheel. */
      duration: 0.9,
      /* Touch screens have their own momentum; a second one fights the first. */
      syncTouch: false,
    });

    /*
      A ResizeObserver catches the page growing, but not every growth resizes
      the observed box in time — a webfont swapping or a late image can land
      after the last measurement. Re-measuring on load costs nothing and makes
      the limit right even then.
    */
    const remeasure = () => lenis.resize();
    window.addEventListener("load", remeasure);
    document.fonts?.ready.then(remeasure).catch(() => {});

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      window.removeEventListener("load", remeasure);
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}
