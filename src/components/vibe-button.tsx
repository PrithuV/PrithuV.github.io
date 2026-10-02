"use client";

import { SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { parseTrackName } from "@/lib/track-name";
import { cn } from "@/lib/utils";

export type VibeTrack = { src: string; title?: string; artist?: string };

export type VibeConfig = {
  tracks: VibeTrack[];
  label?: string;
  playing_label?: string;
  now_playing_label?: string;
  loop: boolean;
  shuffle: boolean;
  volume: number;
};

/** Bar heights and beat lengths, so the waveform is uneven the way a real one is. */
const BARS = [
  { height: 7, beat: "0.72s", delay: "0s" },
  { height: 13, beat: "0.58s", delay: "0.09s" },
  { height: 10, beat: "0.86s", delay: "0.04s" },
  { height: 15, beat: "0.64s", delay: "0.16s" },
  { height: 8, beat: "0.78s", delay: "0.11s" },
];

/** Notes drift out of the bottom of the button while a track runs. */
const NOTES = [
  { glyph: "♪", left: "16%", drift: "-14px", spin: "-18deg", delay: "0s", size: 13 },
  { glyph: "♫", left: "48%", drift: "10px", spin: "16deg", delay: "0.55s", size: 15 },
  { glyph: "♬", left: "72%", drift: "-6px", spin: "-10deg", delay: "1.1s", size: 12 },
  { glyph: "♩", left: "33%", drift: "16px", spin: "22deg", delay: "1.45s", size: 11 },
];

/** How a track is named on screen: the YAML title if it has one, else the filename. */
function displayName(track: VibeTrack) {
  if (track.title) return { title: track.title, artist: track.artist };
  const parsed = parseTrackName(track.src);
  return { title: parsed?.title, artist: track.artist ?? parsed?.artist };
}

/** How long the corner toast stays up before it fades out. */
const TOAST_MS = 5000;

function shuffled(length: number) {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function VibeButton({ vibe }: { vibe: VibeConfig }) {
  const { tracks } = vibe;

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  // The order to play in, and where we are within it.
  const [order, setOrder] = useState<number[]>(() => tracks.map((_, i) => i));
  const [position, setPosition] = useState(0);
  // Swapping the element's src pauses it, which would otherwise look like the
  // listener hitting stop. This marks the pause events we caused ourselves.
  const switchingTrack = useRef(false);
  /*
    The corner toast. It announces what just started — on the first click and
    again whenever the track changes — then gets out of the way. The name is
    never gone for good: hovering the button brings it back.
  */
  /*
    The toast is shown by the click and hidden by a timer — and shown again for
    as long as the pointer rests on the button, which is the way back to a name
    that has already faded.
  */
  const [announced, setAnnounced] = useState(false);
  const [hovering, setHovering] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // A toast outliving the component would set state on nothing.
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const track = tracks[order[position]];

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = vibe.volume;
  }, [vibe.volume]);

  // Whenever the track or the play state changes, make the element agree.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playing) return;
    audio
      .play()
      .then(() => {
        switchingTrack.current = false;
      })
      .catch(() => {
        switchingTrack.current = false;
        setPlaying(false);
      });
  }, [playing, position, order]);

  if (tracks.length === 0 || !track) return null;

  const label = vibe.label ?? "Click here to vibe";
  const playingLabel = vibe.playing_label ?? "Vibing";
  const nowPlayingLabel = vibe.now_playing_label;
  // Either reason to show it: it was just announced, or the pointer is resting
  // on the button asking what this is.
  const showToast = playing && (announced || hovering);
  const name = displayName(track);

  /* Raised from the click and from the track change, never from a render: the
     toast is a reaction to something the listener did, not to state settling. */
  const announce = (index: number | undefined) => {
    const next = index === undefined ? undefined : tracks[index];
    const name = next ? displayName(next) : undefined;
    clearTimeout(toastTimer.current);

    if (!name?.title) {
      setAnnounced(false);
      return;
    }

    setAnnounced(true);
    toastTimer.current = setTimeout(() => setAnnounced(false), TOAST_MS);
  };

  const dismissToast = () => {
    clearTimeout(toastTimer.current);
    setAnnounced(false);
  };

  const advance = (manual: boolean) => {
    switchingTrack.current = true;
    const next = position + 1;
    if (next < order.length) {
      setPosition(next);
      announce(order[next]);
      return;
    }
    if (vibe.loop || manual) {
      setPosition(0);
      announce(order[0]);
      return;
    }
    // End of the playlist, and not looping.
    switchingTrack.current = false;
    setPlaying(false);
    setPosition(0);
    dismissToast();
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      dismissToast();
      return;
    }

    // Shuffling on the click, not during render, keeps the server and the
    // client agreeing on what to draw.
    let starting = order[position];
    if (vibe.shuffle && tracks.length > 1) {
      const next = shuffled(tracks.length);
      setOrder(next);
      setPosition(0);
      starting = next[0];
    }
    setPlaying(true);
    announce(starting);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
    >
      {/* Notes fall out of the bottom: the button sits hard against the top of
          the viewport, so anything drifting upward would be clipped away. */}
      {playing ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-full h-10 overflow-visible"
        >
          {NOTES.map((note) => (
            <span
              key={note.glyph + note.delay}
              className="vibe-note absolute top-0 leading-none text-foreground/70"
              style={
                {
                  left: note.left,
                  fontSize: note.size,
                  animationDelay: note.delay,
                  "--drift": note.drift,
                  "--spin": note.spin,
                } as React.CSSProperties
              }
            >
              {note.glyph}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggle}
          data-playing={playing}
          aria-pressed={playing}
          aria-label={
            playing
              ? `${playingLabel}: ${name.title}${name.artist ? ` by ${name.artist}` : ""} — tap to stop`
              : label
          }
          className={cn(
            "group relative flex h-8 items-center gap-2 rounded-md border px-2.5 text-[15px] font-medium transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
            playing
              ? "border-transparent bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:bg-surface-hover",
          )}
        >
          <span aria-hidden className="flex h-4 items-end gap-[2px]">
            {BARS.map((bar, index) => (
              <span
                key={index}
                className={cn(
                  "vibe-bar w-[2px] rounded-full",
                  playing ? "bg-primary-foreground" : "bg-muted-foreground",
                )}
                style={
                  { height: bar.height, animationDelay: bar.delay, "--beat": bar.beat } as React.CSSProperties
                }
              />
            ))}
          </span>

          <span className="hidden whitespace-nowrap sm:inline">
            {playing ? playingLabel : label}
          </span>
        </button>

        {playing && tracks.length > 1 ? (
          <button
            type="button"
            onClick={() => advance(true)}
            aria-label="Next track"
            className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors outline-none hover:bg-surface-hover hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <SkipForward className="size-3.5" />
          </button>
        ) : null}
      </div>

      {/* Bottom-right of the viewport, in a portal: the header is a
          backdrop-filter ancestor, which would otherwise become the containing
          block for anything fixed inside it. */}
      {playing && name.title
        ? createPortal(
            /*
              Mounted for as long as something is playing and moved in and out
              on `data-open`, so it can animate on the way out as well as in —
              a toast that unmounts the moment it hides can only ever fade in.
            */
            <div
              aria-hidden
              data-open={showToast}
              className={cn(
                "vibe-toast pointer-events-none fixed right-4 bottom-4 z-50 flex max-w-[min(20rem,calc(100vw-2rem))] items-center gap-3 rounded-lg border border-rule bg-popover px-3.5 py-2.5 shadow-(--shadow-soft) sm:right-6 sm:bottom-6",
                showToast
                  ? "translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none translate-y-3 scale-[0.97] opacity-0",
              )}
            >
              <span aria-hidden className="flex h-4 items-end gap-[2px]">
                {BARS.map((bar, index) => (
                  <span
                    key={index}
                    className="vibe-bar w-[2px] rounded-full bg-foreground/60"
                    style={
                      {
                        height: bar.height,
                        animationDelay: bar.delay,
                        "--beat": bar.beat,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </span>

              <div className="min-w-0">
                {nowPlayingLabel ? (
                  <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    {/* The same slow pulse the news line uses, so "now" is
                        something the card shows rather than only claims. */}
                    <span aria-hidden className="news-dot size-1.5 rounded-full bg-grade" />
                    {nowPlayingLabel}
                  </p>
                ) : null}

                <p className="mt-1 truncate text-[14px] leading-[1.35] text-foreground">
                  {name.title}
                </p>
                {name.artist ? (
                  <p className="truncate text-[13px] leading-[1.35] text-muted-foreground">
                    {name.artist}
                  </p>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}

      <audio
        ref={audioRef}
        src={track.src}
        loop={tracks.length === 1 && vibe.loop}
        preload="none"
        onEnded={() => advance(false)}
        onPause={() => {
          if (switchingTrack.current) return;
          setPlaying(false);
        }}
      />
    </div>
  );
}
