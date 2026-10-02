import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

/** A plain anchor for off-site targets, a client-routed link for our own pages. */
export function LinkButton({
  href,
  children,
  variant = "outline",
  size = "sm",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      render={
        isExternal(href) ? (
          <a href={href} target="_blank" rel="noreferrer noopener" />
        ) : (
          <Link href={href} />
        )
      }
    >
      {children}
    </Button>
  );
}
