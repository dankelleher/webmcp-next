import type { NextConfig } from "next";
import type { WebMCPConfig } from "./types.js";

/**
 * Next.js plugin wrapper that configures WebMCP integration.
 *
 * Usage in next.config.ts:
 * ```ts
 * import { withWebMCP } from 'next-webmcp/plugin';
 * export default withWebMCP({ paths: ['/api/**'] })({ ... });
 * ```
 */
export const withWebMCP =
  (mcpConfig: WebMCPConfig = {}) =>
  (nextConfig: NextConfig): NextConfig => ({
    ...nextConfig,
    env: {
      ...nextConfig.env,
      WEBMCP_CONFIG: JSON.stringify(mcpConfig),
    },
    // Rewrite /.well-known/mcp to our internal handler
    async rewrites() {
      const existingRewrites = await nextConfig.rewrites?.();
      const mcpRewrites = [
        {
          source: "/.well-known/mcp",
          destination: "/api/mcp/manifest",
        },
      ];

      if (Array.isArray(existingRewrites)) {
        return [...existingRewrites, ...mcpRewrites];
      }

      if (existingRewrites) {
        return {
          ...existingRewrites,
          afterFiles: [
            ...(existingRewrites.afterFiles ?? []),
            ...mcpRewrites,
          ],
        };
      }

      return mcpRewrites;
    },
  });
