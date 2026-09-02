import type { MetadataRoute } from "next";
import manifest from "@/data/manifest.json";
import { STRATEGIES } from "@/lib/options/strategies";
import { TOURS } from "@/components/cockpit/tour/tours";

const ORIGIN = "https://optionaut.org";

/** Every prerendered address, built from the same sources as the pages
 *  themselves (manifest, strategies, tours) so the two can't drift. Legacy
 *  tour slugs are left out: they canonicalize to the tours that absorbed
 *  them. */
export default function sitemap(): MetadataRoute.Sitemap {
  const entry = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${ORIGIN}${path}`,
    priority,
  });
  return [
    entry("/", 1),
    entry("/learn", 0.9),
    entry("/glossary", 0.8),
    entry("/about", 0.6),
    ...TOURS.map((t) => entry(`/learn/${t.id}`, 0.8)),
    ...manifest.map((m) => entry(`/t/${m.symbol}`, 0.6)),
    ...manifest.flatMap((m) => STRATEGIES.map((s) => entry(`/lab/${m.symbol}/${s.id}`, 0.5))),
  ];
}
