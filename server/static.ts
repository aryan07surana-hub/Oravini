import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

let distPath: string;

try {
  distPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "public"
  );
} catch {
  distPath = path.resolve(process.cwd(), "dist", "public");
}

export function serveStatic(app: Express) {
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
