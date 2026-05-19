import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Siden finnes ikke",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          Siden du leter etter finnes ikke
        </p>
        <Link
          href="/"
          className="text-primary underline hover:text-primary/90"
        >
          Tilbake til forsiden
        </Link>
      </div>
    </div>
  );
}
