import { describe, expect, it } from "vitest";
import {
  MAX_ATTACHMENT_BYTES,
  sanitizeOriginalFilename,
  validateAttachmentFile,
  validateRemovalReason,
} from "../../src/attachments/attachment-policy.js";

describe("attachment policy", () => {
  it.each([
    ["photo.jpg", "image/jpeg", Buffer.from([0xff, 0xd8, 0xff])],
    ["photo.png", "image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ["photo.webp", "image/webp", Buffer.from("RIFF1234WEBP")],
    ["request.pdf", "application/pdf", Buffer.from("%PDF-1.7")],
  ])("accepts a permitted %s attachment", (originalname, mimetype, buffer) => {
    expect(validateAttachmentFile({ originalname, mimetype, size: buffer.length, buffer }))
      .toMatchObject({ ok: true, mimeType: mimetype });
  });

  it("rejects mismatched MIME, extension, and file signature", () => {
    expect(validateAttachmentFile({
      originalname: "photo.jpg",
      mimetype: "image/jpeg",
      size: 5,
      buffer: Buffer.from("%PDF-"),
    })).toEqual({ ok: false, code: "UNSUPPORTED_TYPE" });
  });

  it("allows exactly 5 MiB and rejects one byte over", () => {
    const exact = Buffer.alloc(MAX_ATTACHMENT_BYTES);
    exact.set(Buffer.from("%PDF-"));
    expect(validateAttachmentFile({
      originalname: "exact.pdf",
      mimetype: "application/pdf",
      size: MAX_ATTACHMENT_BYTES,
      buffer: exact,
    }).ok).toBe(true);
    expect(validateAttachmentFile({
      originalname: "too-large.pdf",
      mimetype: "application/pdf",
      size: MAX_ATTACHMENT_BYTES + 1,
      buffer: Buffer.from("%PDF-"),
    })).toEqual({ ok: false, code: "FILE_TOO_LARGE" });
  });

  it("sanitizes file paths and control characters without exposing a path", () => {
    expect(sanitizeOriginalFilename("../../private\\report\u0000.pdf"))
      .toBe("private_report_.pdf");
  });

  it("validates the inclusive removal-reason boundaries", () => {
    expect(validateRemovalReason("  remove  ")).toEqual({ ok: true, value: "remove" });
    expect(validateRemovalReason("no")).toEqual({ ok: false });
    expect(validateRemovalReason("r".repeat(251))).toEqual({ ok: false });
  });
});
