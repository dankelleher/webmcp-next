import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import {
  analyzeResourceData,
  extractDescription,
  extractExportObject,
  extractInputSchema,
  extractMimeType,
} from "./parser.js";
import type {
  DiscoveredResource,
  DiscoveredTool,
  MCPManifest,
  WebMCPConfig,
} from "./types.js";

/** Converts a Next.js file path to an API route path */
export const filePathToRoutePath = (
  filePath: string,
  appDir: string
): string => {
  const rel = relative(appDir, filePath);
  const segments = rel.split(sep);

  // Remove the filename (route.ts, page.tsx, etc.)
  segments.pop();

  return (
    "/" +
    segments
      .filter((s) => !s.startsWith("(")) // remove route groups
      .join("/")
  );
};

/** Converts a Next.js route path to an MCP tool name (e.g., /api/cart/add -> api_cart_add) */
export const routePathToToolName = (routePath: string): string =>
  routePath
    .replace(/^\//, "")
    .replace(/\[([^\]]+)\]/g, "$1")
    .replace(/\//g, "_");

/**
 * Converts a Next.js route path to an MCP resource URI template.
 * e.g., /products/[category] -> products/{category}
 */
export const routePathToUriTemplate = (routePath: string): string =>
  routePath
    .replace(/^\//, "")
    .replace(/\[([^\]]+)\]/g, "{$1}");

/** Checks if a route path matches any of the configured path filters */
export const matchesPathFilter = (
  routePath: string,
  paths: string[] | undefined
): boolean => {
  if (!paths || paths.length === 0) return true;

  return paths.some((pattern) => {
    const regexStr = pattern
      .replace(/\*\*/g, "___GLOBSTAR___")
      .replace(/\*/g, "[^/]*")
      .replace(/___GLOBSTAR___/g, ".*");
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(routePath);
  });
};

/** Checks if a file path looks like a route file */
const isRouteFile = (filePath: string): boolean =>
  /\/(route|page)\.(ts|tsx|js|jsx)$/.test(filePath);

/** Recursively finds all route files in the app directory */
const findRouteFiles = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findRouteFiles(fullPath)));
    } else if (isRouteFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
};

/** Scans a single route file and extracts tool/resource metadata from source */
const parseRouteFile = async (
  filePath: string,
  appDir: string
): Promise<{
  tool?: DiscoveredTool;
  resource?: DiscoveredResource;
}> => {
  const source = await readFile(filePath, "utf-8");
  const routePath = filePathToRoutePath(filePath, appDir);
  const result: { tool?: DiscoveredTool; resource?: DiscoveredResource } = {};

  // Parse tool export
  const toolSource = extractExportObject(source, "tool");
  if (toolSource) {
    result.tool = {
      name: routePathToToolName(routePath),
      description: extractDescription(toolSource),
      inputSchema: extractInputSchema(toolSource),
      routePath,
      method: "POST",
    };
  }

  // Parse resource export
  const resourceSource = extractExportObject(source, "resource");
  if (resourceSource) {
    const uriTemplate = routePathToUriTemplate(routePath);
    const { isFunction } = analyzeResourceData(resourceSource);

    result.resource = {
      name: routePathToToolName(routePath),
      description: extractDescription(resourceSource),
      mimeType: extractMimeType(resourceSource),
      uriTemplate,
      isTemplate: uriTemplate.includes("{"),
    };
  }

  return result;
};

/**
 * Scans the app directory and builds a complete MCP manifest
 * by parsing `export const tool` and `export const resource` from route files.
 */
export const buildManifest = async (
  appDir: string,
  config: WebMCPConfig = {}
): Promise<MCPManifest> => {
  const tools: DiscoveredTool[] = [];
  const resources: DiscoveredResource[] = [];

  const routeFiles = await findRouteFiles(appDir);

  for (const filePath of routeFiles) {
    const routePath = filePathToRoutePath(filePath, appDir);

    if (!matchesPathFilter(routePath, config.paths)) continue;

    const parsed = await parseRouteFile(filePath, appDir);

    if (parsed.tool) tools.push(parsed.tool);
    if (parsed.resource) resources.push(parsed.resource);
  }

  return { tools, resources };
};
