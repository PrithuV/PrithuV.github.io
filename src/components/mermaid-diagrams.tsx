"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

/**
 * Draws every `<pre class="mermaid">` the post body contains.
 *
 * Mermaid needs a DOM to measure text, so this runs in the browser rather than
 * at build time. The import is dynamic and the component only mounts on pages
 * that actually contain a diagram, so the bundle — which is large — never loads
 * for an ordinary post.
 */
export function MermaidDiagrams() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function draw() {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>("pre.mermaid"),
      );
      if (nodes.length === 0) return;

      // Rendering replaces the source with an <svg>, so the original has to be
      // kept somewhere for the re-draw on a theme change.
      for (const node of nodes) {
        if (!node.dataset.source) node.dataset.source = node.textContent ?? "";
        node.textContent = node.dataset.source;
        node.removeAttribute("data-processed");
      }

      const { default: mermaid } = await import("mermaid");
      if (cancelled) return;

      mermaid.initialize({
        startOnLoad: false,
        // `base` lets the CSS variables below decide the palette, so a diagram
        // matches whichever theme the reader is on.
        theme: "base",
        darkMode: resolvedTheme === "dark",
        fontFamily: "var(--font-google-sans), system-ui, sans-serif",
        themeVariables: readThemeVariables(),
      });

      await mermaid.run({ nodes });
    }

    // A failed diagram should not take the rest of the post down with it.
    draw().catch((error) => {
      console.error("[mermaid] could not render a diagram", error);
    });

    return () => {
      cancelled = true;
    };
  }, [resolvedTheme]);

  return null;
}

/** Reads the site's own tokens so diagrams inherit the page palette. */
function readThemeVariables() {
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;

  const background = token("--background", "#ffffff");
  const foreground = token("--foreground", "#37352f");
  const surface = token("--surface", "#f7f6f3");
  const rule = token("--rule", "rgba(55, 53, 47, 0.16)");
  const link = token("--link", "#337ea9");

  return {
    background,
    primaryColor: surface,
    primaryTextColor: foreground,
    primaryBorderColor: rule,
    secondaryColor: surface,
    tertiaryColor: background,
    lineColor: link,
    textColor: foreground,
    mainBkg: surface,
    nodeBorder: rule,
    clusterBkg: background,
    clusterBorder: rule,
    edgeLabelBackground: background,
    fontSize: "14px",
  };
}
