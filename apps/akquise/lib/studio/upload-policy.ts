export const MAX_UPLOAD = 8 * 1024 * 1024;
export const MAX_VIDEO_UPLOAD = 64 * 1024 * 1024;
export const isVideoUpload = (name: string) => /\.(mp4|m4v|mov)$/i.test(name);
export const uploadLimit = (name: string) =>
  isVideoUpload(name) ? MAX_VIDEO_UPLOAD : MAX_UPLOAD;

export function uploadProblem(name: string, size: number): string | null {
  if (!/\.(jpe?g|png|webp|mp4|m4v|mov|pdf|txt|ttf|otf)$/i.test(name))
    return "Dateiformat nicht unterstützt. JPEG, PNG, WebP, MP4, MOV, PDF, TXT oder TTF/OTF wählen.";
  if (!size) return "Die Datei ist leer. Bitte vollständig aus Drive laden.";
  if (size > uploadLimit(name))
    return isVideoUpload(name)
      ? "Video zu gross: maximal 64 MB. Für grössere Videos einen Link hinzufügen."
      : "Datei zu gross: maximal 8 MB.";
  return null;
}
