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

export function serveStatic(app: Express, publicDirectory = distPath) {
  if (!fs.existsSync(publicDirectory)) {
    throw new Error(
      `Could not find the build directory: ${publicDirectory}, make sure to build the client first`,
    );
  }

  app.use(express.static(publicDirectory, { extensions: ["html"] }));

  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.resolve(publicDirectory, "index.html"));
  });
}
