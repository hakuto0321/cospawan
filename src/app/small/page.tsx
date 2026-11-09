import type { Metadata } from "next";
import { TopPage } from "@/components/TopPage";

export const metadata: Metadata = {
  title: "小動物用品の今日の買いどき",
  alternates: { canonical: "/small" },
};

export default async function SmallHome({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <TopPage pet="small" category={category} />;
}
