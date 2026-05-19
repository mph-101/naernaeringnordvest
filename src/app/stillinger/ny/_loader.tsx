"use client";

import dynamic from "next/dynamic";

export const PageClient = dynamic(
  () => import("./client").then((m) => ({ default: m.StillingNyClient })),
  { ssr: false }
);
