"use client";

import dynamic from "next/dynamic";

export const PageClient = dynamic(
  () => import("./frontpage-client").then((m) => ({ default: m.FrontpageClient })),
  { ssr: false }
);
