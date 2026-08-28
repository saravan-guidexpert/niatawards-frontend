/**
 * Cloudinary delivery transforms for display only.
 * Stored nomination `photo_url` values stay unchanged — pass this result to `img src`.
 */
export function cloudinaryDisplayUrl(
  url: string,
  opts: { width: number; height?: number; crop?: "fill" | "limit" | "fit" },
): string {
  if (!url || url.startsWith("blob:") || url.startsWith("data:")) return url;
  const marker = "/image/upload/";
  const i = url.indexOf(marker);
  if (i === -1 || !url.includes("res.cloudinary.com")) return url;

  const crop = opts.crop ?? "fill";
  const parts = [`f_auto`, `q_auto`, `c_${crop}`, `w_${Math.round(opts.width)}`];
  if (opts.height) parts.push(`h_${Math.round(opts.height)}`);
  const transform = parts.join(",");

  const after = url.slice(i + marker.length);
  if (after.startsWith(`${transform}/`)) return url;

  return `${url.slice(0, i + marker.length)}${transform}/${after}`;
}
