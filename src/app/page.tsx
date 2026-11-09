import { TopPage } from "@/components/TopPage";

export default async function Home({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <TopPage pet="dog" category={category} />;
}
