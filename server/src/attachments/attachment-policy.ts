export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export interface AttachmentFileInput {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

type AllowedType = {
  mimeType: string;
  extensions: string[];
  signature: (buffer: Buffer) => boolean;
};

const ALLOWED_TYPES: AllowedType[] = [
  {
    mimeType: "image/jpeg",
    extensions: [".jpg", ".jpeg"],
    signature: (buffer) => buffer.length >= 3
      && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  {
    mimeType: "image/png",
    extensions: [".png"],
    signature: (buffer) => buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
  },
  {
    mimeType: "image/webp",
    extensions: [".webp"],
    signature: (buffer) => buffer.subarray(0, 4).toString() === "RIFF"
      && buffer.subarray(8, 12).toString() === "WEBP",
  },
  {
    mimeType: "application/pdf",
    extensions: [".pdf"],
    signature: (buffer) => buffer.subarray(0, 5).toString() === "%PDF-",
  },
];

function extensionOf(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index).toLowerCase() : "";
}

export function validateAttachmentFile(file: AttachmentFileInput):
  | { ok: true; mimeType: string }
  | { ok: false; code: "FILE_TOO_LARGE" | "UNSUPPORTED_TYPE" } {
  if (file.size > MAX_ATTACHMENT_BYTES) return { ok: false, code: "FILE_TOO_LARGE" };
  const allowed = ALLOWED_TYPES.find((type) => type.mimeType === file.mimetype);
  if (!allowed || !allowed.extensions.includes(extensionOf(file.originalname)) || !allowed.signature(file.buffer)) {
    return { ok: false, code: "UNSUPPORTED_TYPE" };
  }
  return { ok: true, mimeType: allowed.mimeType };
}

export function sanitizeOriginalFilename(filename: string): string {
  const leaf = filename.split("/").pop() ?? "attachment";
  const sanitized = leaf.replace(/[\\\u0000-\u001f\u007f]/g, "_").trim().slice(0, 255);
  return sanitized || "attachment";
}

export function validateRemovalReason(reason: unknown):
  | { ok: true; value: string }
  | { ok: false } {
  const value = typeof reason === "string" ? reason.trim() : "";
  return value.length >= 5 && value.length <= 250
    ? { ok: true, value }
    : { ok: false };
}
