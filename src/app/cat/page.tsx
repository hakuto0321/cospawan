import type { Metadata } from "next";
import { TopPage } from "@/components/TopPage";

export const metadata: Metadata = {
  title: "猫用品の今日の買いどき",
  alternates: { canonical: "/cat" },
};

export default function CatHome() {
  return <TopPage pet="cat" />;
}
