import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OAuth callbacks contain a one-use code. Keep them out of development request logs.
  logging: { incomingRequests: { ignore: [/\/api\/auth\/callback/] } },
};

export default nextConfig;
