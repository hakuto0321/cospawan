import type { MetadataRoute } from "next";
import { getDataSource } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await getDataSource().getAllProducts();
  const latest = items.map((i) => i.fetchedAt).sort().at(-1);

  return [
    { url: `${SITE_URL}/`, lastModified: latest, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/cat`, lastModified: latest, changeFrequency: "daily", priority: 1 },
    ...items.map((i) => ({
      url: `${SITE_URL}/products/${i.product.jan}`,
      lastModified: i.fetchedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.1 },
  ];
}
