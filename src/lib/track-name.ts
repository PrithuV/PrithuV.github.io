export type TrackName = { title: string; artist?: string };

/**
 * Reads a track's name out of its filename, which is expected to be
 * `Song Name, Artist.mp3`.
 *
 * The split is on the *last* comma, so a song whose own title contains one
 * ("Hello, Goodbye, The Beatles") still resolves correctly. With no comma at
 * all the whole filename is the title and there is no artist.
 *
 * Whatever you type is otherwise kept as-is — capitalisation and hyphens
 * included, so "Lo-Fi" stays "Lo-Fi".
 */
export function parseTrackName(src: string): TrackName | undefined {
  const file = src.split(/[?#]/)[0].split("/").pop();
  if (!file) return undefined;

  let name: string;
  try {
    name = decodeURIComponent(file);
  } catch {
    name = file;
  }

  name = name
    .replace(/\.[a-z0-9]{1,5}$/i, "")   // extension
    .replace(/^\d+\s*[-_.]\s*/, "")      // leading track number
    .replace(/_+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!name) return undefined;

  const comma = name.lastIndexOf(",");
  if (comma === -1) return { title: name };

  const title = name.slice(0, comma).trim();
  const artist = name.slice(comma + 1).trim();

  // A trailing comma with nothing after it is just a title.
  if (!title) return { title: name };
  return artist ? { title, artist } : { title };
}
