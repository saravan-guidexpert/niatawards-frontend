const copyViaTextarea = (text: string) => {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
};

const downloadTextFile = (filename: string, text: string) => {
  const blob = new Blob([text], { type: "text/tab-separated-values;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

/**
 * Prefer the async clipboard API, then a hidden textarea, then a TSV download.
 * Large Offline Team / Unique Teachers sheets often exceed clipboard limits.
 */
export const copyTextWithFallback = async (
  text: string,
  filename: string,
): Promise<"copied" | "downloaded"> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }
  } catch {
    /* fall through */
  }
  if (copyViaTextarea(text)) return "copied";
  downloadTextFile(filename, text);
  return "downloaded";
};
