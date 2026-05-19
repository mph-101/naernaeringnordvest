import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ny stilling",
  description: "Registrer ny stillingsannonse",
};

export default function Page() {
  return <PageClient />;
}
