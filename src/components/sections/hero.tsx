import Image from "next/image";
import Link from "next/link";

import { NewsLine } from "@/components/news-line";
import { Button } from "@/components/ui/button";
import { getHero, getNews } from "@/lib/content";

export function HeroSection() {
  const hero = getHero();
  const news = getNews();

  return (
    <section className="mx-auto w-full max-w-[1040px] px-6 pt-24 pb-24 sm:pt-36 sm:pb-32">
      {/*
        The portrait sits beside the text on wide screens and above it on
        narrow ones. `flex-col-reverse` puts the photo first in reading order
        on mobile while keeping the name first in the DOM, so the heading is
        still the first thing a screen reader reaches.
      */}
      <div className="flex flex-col-reverse gap-8 sm:flex-row sm:items-start sm:justify-between sm:gap-12">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-[45px] font-normal leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[65px]">
            {hero.name}
          </h1>

          <p className="mt-3 text-[21px] leading-[1.4] text-muted-foreground sm:text-[26px]">
            {hero.title}
          </p>

          {hero.tagline ? (
            <p className="mt-7 max-w-[58ch] text-[18px] leading-[1.65] text-foreground/85">
              {hero.tagline}
            </p>
          ) : null}

          {hero.location ? (
            <p className="mt-5 text-[16px] text-muted-foreground">{hero.location}</p>
          ) : null}

          {news.items.length > 0 ? (
            <NewsLine label={news.label} items={news.items} interval={news.interval} />
          ) : null}

          {hero.actions.length > 0 ? (
            <div className="mt-9 flex flex-wrap items-center gap-2.5">
              {hero.actions.map((action) => (
                <Button
                  key={`${action.label}-${action.href}`}
                  render={<Link href={action.href} />}
                  variant={action.variant === "primary" ? "default" : "outline"}
                  size="lg"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        {/*
          Portrait, then the credentials directly under it: badge art over its
          own name, so a credential reads as a thing you can click rather than
          as another chip in the run of text.
        */}
        {hero.photo || hero.badges.length > 0 ? (
          <div className="flex shrink-0 flex-col items-center gap-5">
            {hero.photo ? (
              <div className="relative size-[132px] overflow-hidden rounded-xl border border-rule bg-surface shadow-(--shadow-soft) sm:size-[172px]">
                <Image
                  src={hero.photo}
                  alt={hero.photo_alt ?? hero.name}
                  fill
                  // Never larger than the rendered box, so the browser can skip
                  // the full-resolution file on small screens.
                  sizes="172px"
                  className="object-cover"
                  priority
                />
              </div>
            ) : null}

            {hero.badges.length > 0 ? (
              <ul className="flex flex-wrap items-start justify-center gap-5">
                {hero.badges.map((badge) => {
                  const art = (
                    <>
                      <Image
                        src={badge.image}
                        alt=""
                        width={64}
                        height={64}
                        className="size-14 object-contain transition-transform duration-200 group-hover:scale-105 sm:size-16"
                      />
                      <span className="max-w-[9rem] text-center text-[14px] leading-[1.3] text-muted-foreground transition-colors group-hover:text-foreground">
                        {badge.label}
                      </span>
                    </>
                  );

                  return (
                    <li key={`${badge.label}-${badge.image}`}>
                      {badge.href ? (
                        <Link
                          href={badge.href}
                          className="group flex flex-col items-center gap-2 rounded-md outline-offset-4"
                        >
                          {art}
                        </Link>
                      ) : (
                        <span className="flex flex-col items-center gap-2">{art}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
