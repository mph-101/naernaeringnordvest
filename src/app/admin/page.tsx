import type { Metadata } from "next";
import { AdminClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  description: "Administrasjonspanel",
};

export default function Page() {
  return <AdminClient />;
}
