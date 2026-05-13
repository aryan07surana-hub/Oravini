/**
 * File Upload Security — Magic Byte Validation
 * 
 * Validates uploaded files by checking their magic bytes (file signatures)
 * to prevent disguised malicious files (e.g., .exe renamed to .jpg).
 */

import fs from "fs";

// Magic byte signatures for common file types
const MAGIC_BYTES: Record<string, { offset: number; bytes: number[] }[]> = {
  // Images
  ".jpg": [{ offset: 0, bytes: [0xFF, 0xD8, 0xFF] }],
  ".jpeg": [{ offset: 0, bytes: [0xFF, 0xD8, 0xFF] }],
  ".png": [{ offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
  ".gif": [
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
  ".webp": [{ offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }], // "WEBP" at offset 8
  ".svg": [], // SVG is text-based, check differently
  ".bmp": [{ offset: 0, bytes: [0x42, 0x4D] }],

  // Videos
  ".mp4": [
    { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // "ftyp"
  ],
  ".mov": [
    { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // also uses ftyp
    { offset: 4, bytes: [0x6D, 0x6F, 0x6F, 0x76] }, // "moov"
  ],
  ".webm": [{ offset: 0, bytes: [0x1A, 0x45, 0xDF, 0xA3] }], // EBML header
  ".mkv": [{ offset: 0, bytes: [0x1A, 0x45, 0xDF, 0xA3] }],
  ".avi": [{ offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }], // "RIFF"
  ".m4v": [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }],

  // Audio
  ".mp3": [
    { offset: 0, bytes: [0xFF, 0xFB] }, // MPEG audio frame
    { offset: 0, bytes: [0xFF, 0xF3] },
    { offset: 0, bytes: [0xFF, 0xF2] },
    { offset: 0, bytes: [0x49, 0x44, 0x33] }, // ID3 tag
  ],
  ".m4a": [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }],
  ".wav": [{ offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }], // "RIFF"

  // Documents
  ".pdf": [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // "%PDF"
};

// Known dangerous file signatures to always reject
const DANGEROUS_SIGNATURES = [
  { name: "Windows Executable", bytes: [0x4D, 0x5A] }, // MZ header (.exe, .dll)
  { name: "ELF Binary", bytes: [0x7F, 0x45, 0x4C, 0x46] }, // Linux executable
  { name: "Mach-O Binary", bytes: [0xFE, 0xED, 0xFA, 0xCE] }, // macOS executable
  { name: "Mach-O Binary (64)", bytes: [0xFE, 0xED, 0xFA, 0xCF] },
  { name: "Java Class", bytes: [0xCA, 0xFE, 0xBA, 0xBE] },
  { name: "Shell Script", bytes: [0x23, 0x21] }, // "#!" shebang
];

/**
 * Validate a file's magic bytes match its claimed extension.
 * Returns { valid: true } if the file is safe, or { valid: false, reason } if suspicious.
 */
export async function validateFileMagicBytes(
  filePath: string,
  claimedExtension: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Read first 32 bytes of the file
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(32);
    fs.readSync(fd, buffer, 0, 32, 0);
    fs.closeSync(fd);

    // Always check for dangerous file types regardless of extension
    for (const dangerous of DANGEROUS_SIGNATURES) {
      const matches = dangerous.bytes.every((byte, i) => buffer[i] === byte);
      if (matches) {
        return {
          valid: false,
          reason: `File contains ${dangerous.name} signature — upload rejected`,
        };
      }
    }

    // If we have magic byte definitions for this extension, validate
    const ext = claimedExtension.toLowerCase();
    const signatures = MAGIC_BYTES[ext];

    if (!signatures || signatures.length === 0) {
      // No signature defined for this type — allow but log
      return { valid: true };
    }

    // Check if any of the valid signatures match
    const matchesAny = signatures.some((sig) =>
      sig.bytes.every((byte, i) => buffer[sig.offset + i] === byte)
    );

    if (!matchesAny) {
      return {
        valid: false,
        reason: `File content doesn't match claimed type (${ext}). Possible disguised file.`,
      };
    }

    return { valid: true };
  } catch (err) {
    console.error("[security] File validation error:", err);
    // If we can't read the file, reject it
    return { valid: false, reason: "Unable to validate file content" };
  }
}

/**
 * Middleware-style validator for use after multer processes the upload.
 * Call this in your route handler after upload completes.
 */
export async function validateUploadedFile(
  filePath: string,
  originalName: string
): Promise<{ valid: boolean; reason?: string }> {
  const ext = "." + originalName.split(".").pop()?.toLowerCase();
  return validateFileMagicBytes(filePath, ext);
}
