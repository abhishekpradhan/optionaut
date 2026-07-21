import type { Metadata } from "next";
import { Cockpit } from "@/components/cockpit/Cockpit";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Options Lab is, how its numbers are computed, and the fine print — an educational instrument, not advice.",
};

export default function AboutPage() {
  return <Cockpit initial={{ overlay: "about" }} />;
}
