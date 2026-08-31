import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

const offlineRevision = createHash("md5")
  .update(readFileSync("app/~offline/page.tsx", "utf-8"))
  .digest("hex");

const appRevision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout.trim() ||
  randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [
      { url: "/", revision: appRevision },
      { url: "/agendar", revision: appRevision },
      { url: "/cliente", revision: appRevision },
      { url: "/admin", revision: appRevision },
      { url: "/admin/agenda", revision: appRevision },
      { url: "/~offline", revision: offlineRevision },
    ],
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
  });
