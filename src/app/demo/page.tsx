import type { Metadata } from "next";
import { connection } from "next/server";
import Dashboard, { type DemoDashboardData } from "@/components/dashboard";
import demoData from "@/data/demo-dashboard.json";

export const metadata: Metadata = {
  title: "Live demo · TasteGraph",
  description: "Explore a real, anonymized TasteGraph listening dashboard. No Spotify account needed.",
};

export default async function DemoPage() {
  // Rendered per request so the proxy's CSP nonce reaches Next's scripts.
  await connection();
  return <Dashboard demoData={demoData as DemoDashboardData} />;
}
