import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
};

export default withSerwist(nextConfig);
