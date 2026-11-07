import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

export default nextConfig;

// next dev のときも Cloudflare の機能（R2 など）を使えるようにする
initOpenNextCloudflareForDev();
