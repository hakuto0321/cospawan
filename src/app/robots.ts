import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// AI のクローラーも含めて、すべて許可する（AEO 対策）
// /go/ は送客リダイレクト（D1）。クローラーが押すとクリック記録がふくらむので入れない
const DISALLOW = ["/go/"];

// 明示しておく AI クローラー（「*」で許可済みだが、許可していることをはっきりさせる）
const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_BOTS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
