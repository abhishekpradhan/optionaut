import type { Metadata } from "next";
import { Cockpit } from "@/components/cockpit/Cockpit";

export const metadata: Metadata = {
  title: "Tours",
  description:
    "Guided tours that fly the real instrument — zero to iron condor, every concept taught by doing it. Free and educational.",
};

export default function LearnPage() {
  return <Cockpit initial={{ overlay: "tours" }} />;
}
