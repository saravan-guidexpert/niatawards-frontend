import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadNominationPhoto } from "@/lib/api";
import { cloudinaryDisplayUrl } from "@/lib/cloudinaryUrl";

const MAX_BYTES = 3 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);

const extOf = (name: string) => {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
};

type Props = {
  value: string;
  onChange: (url: string) => void;
  variant?: "dark" | "light";
  onBusyChange?: (busy: boolean) => void;
};

const TeacherPhotoUpload = ({ value, onChange, variant = "dark", onBusyChange }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [localPreview, setLocalPreview] = useState("");
  const [previewBroken, setPreviewBroken] = useState(false);

  const dark = variant === "dark";
  const preview = value || localPreview;

  const pickFile = async (file?: File) => {
    if (!file) return;
    setError("");
    const ext = extOf(file.name);
    const mime = (file.type || "").toLowerCase();
    const typeOk =
      ALLOWED_EXT.has(ext) ||
      mime === "image/jpeg" ||
      mime === "image/png" ||
      mime === "image/webp" ||
      mime === "image/heic" ||
      mime === "image/heif";
    if (!typeOk) {
      setError("Use a JPG, PNG, WebP, or HEIC photo");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Photo must be 3MB or smaller");
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    setLocalPreview(blobUrl);
    setPreviewBroken(false);
    setUploading(true);
    onBusyChange?.(true);
    try {
      const url = await uploadNominationPhoto(file);
      onChange(url);
      setPreviewBroken(false);
      setLocalPreview("");
      URL.revokeObjectURL(blobUrl);
    } catch (err: unknown) {
      onChange("");
      setLocalPreview("");
      URL.revokeObjectURL(blobUrl);
      setError(err instanceof Error ? err.message : "Could not upload the photo");
    } finally {
      setUploading(false);
      onBusyChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = () => {
    onChange("");
    setLocalPreview("");
    setPreviewBroken(false);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <label
        className={`block text-[11px] font-semibold mb-1 uppercase tracking-wider ${
          dark ? "text-white/60" : "text-foreground/70"
        }`}
      >
        Teacher photo <span className={dark ? "text-white/35 font-normal normal-case" : "text-foreground/40 font-normal normal-case"}>(optional, max 3MB)</span>
      </label>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => void pickFile(e.target.files?.[0])}
      />
      {preview && !previewBroken ? (
        <div
          className={`relative rounded-lg overflow-hidden ${
            dark ? "border border-white/20" : "border border-border"
          }`}
        >
          <img
            src={cloudinaryDisplayUrl(preview, { width: 560 })}
            alt="Teacher photo preview"
            width={560}
            height={112}
            className="h-28 w-full object-cover"
            onError={() => setPreviewBroken(true)}
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 text-white text-xs font-medium">
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={remove}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
              aria-label="Remove photo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className={`w-full rounded-lg px-3 py-4 flex flex-col items-center justify-center gap-1.5 border border-dashed transition-colors disabled:opacity-60 ${
            dark
              ? "border-white/25 bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"
              : "border-border bg-muted/40 text-foreground/70 hover:bg-muted/70"
          }`}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ImagePlus className="w-5 h-5" />
          )}
          <span className="text-[12px] font-medium">
            {previewBroken ? "Photo selected (preview unavailable)" : "Add a photo of the teacher"}
          </span>
          <span className={`text-[10px] ${dark ? "text-white/35" : "text-foreground/45"}`}>
            JPG, PNG, WebP, or HEIC
          </span>
        </button>
      )}
      {error && (
        <p className={`mt-1 text-[11px] ${dark ? "text-red-300" : "text-destructive"}`}>{error}</p>
      )}
    </div>
  );
};

export default TeacherPhotoUpload;
