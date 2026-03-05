import type { NextConfig } from "next";
import { withWebMCP } from "next-webmcp";

const nextConfig: NextConfig = {};

export default withWebMCP()(nextConfig);
