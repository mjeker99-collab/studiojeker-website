// Validate ISO BMFF/QuickTime structure, not the provider's MIME label.
// Originals are stored privately for download; no decoding or transcoding.
type Box = { type: string; start: number; end: number };
function boxes(bytes: Buffer, start = 0, end = bytes.length): Box[] {
  const result: Box[] = [];
  while (start < end) {
    if (end - start < 8) throw new Error("Incomplete video box");
    let size = bytes.readUInt32BE(start);
    let header = 8;
    if (size === 1) {
      if (end - start < 16) throw new Error("Incomplete extended video box");
      const extended = bytes.readBigUInt64BE(start + 8);
      if (extended > BigInt(end - start)) throw new Error("Invalid video size");
      size = Number(extended);
      header = 16;
    } else if (size === 0) size = end - start;
    if (size < header || size > end - start || result.length >= 10000)
      throw new Error("Invalid video box");
    result.push({ type: bytes.toString("ascii", start + 4, start + 8), start: start + header, end: start + size });
    start += size;
  }
  return result;
}

export function videoUploadMime(bytes: Buffer): string {
  const top = boxes(bytes);
  const ftyp = top.find((b) => b.type === "ftyp");
  const moov = top.find((b) => b.type === "moov");
  if (!moov || !top.some((b) => b.type === "mdat" && b.end > b.start))
    throw new Error("Missing movie data");
  const video = boxes(bytes, moov.start, moov.end)
    .filter((b) => b.type === "trak")
    .some((track) => boxes(bytes, track.start, track.end)
      .filter((b) => b.type === "mdia")
      .some((media) => boxes(bytes, media.start, media.end)
        .some((b) => b.type === "hdlr" && b.end - b.start >= 12 &&
          bytes.toString("ascii", b.start + 8, b.start + 12) === "vide")));
  if (!video) throw new Error("Missing video track");
  // Older QuickTime files can omit ftyp.
  if (!ftyp) return "video/quicktime";
  if (ftyp.end - ftyp.start < 8) throw new Error("Invalid file type");
  const brand = bytes.toString("ascii", ftyp.start, ftyp.start + 4);
  if (!/^(isom|iso[2-9]|mp4[12]|avc1|M4V |qt  )$/.test(brand))
    throw new Error("Unsupported video container");
  return brand === "qt  " ? "video/quicktime" : "video/mp4";
}
