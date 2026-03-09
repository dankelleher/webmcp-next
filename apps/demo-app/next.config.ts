import type { NextConfig } from "next";
import { withWebMCP } from "webmcp-next";

const nextConfig: NextConfig = {};

export default withWebMCP()(nextConfig);
