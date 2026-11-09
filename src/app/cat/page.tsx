import type { Metadata } from "next";
import { TopPage } from "@/components/TopPage";

export const metadata: Metadata = {
  title: "猫用品の今日の買いどき",
  alternates: { canonical: "/cat" },
};

export default async function CatHome({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <TopPage pet="cat" category={category} />;
}
