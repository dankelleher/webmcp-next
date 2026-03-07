import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import {
  extractDescription,
  extractInputSchema,
  extractPropertyAssignment,
  extractChainedSchema,
  extractMcpMiddlewareDescription,
  hasExportedFunction,
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

/** Converts a Next.js route path to an MCP name (e.g., /api/products -> api_products) */
export const routePathToName = (routePath: string): string =>
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
  /\/(route)\.(ts|tsx|js|jsx)$/.test(filePath);

/** Checks if a file is a TypeScript/JS file (for server action scanning) */
const isSourceFile = (filePath: string): boolean =>
  /\.(ts|tsx|js|jsx)$/.test(filePath);

/** Recursively finds files in the app directory */
const findFiles = async (
  dir: string,
  predicate: (filePath: string) => boolean
): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findFiles(fullPath, predicate)));
    } else if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
};

/**
 * Scans a route file for exported HTTP methods (GET, POST, etc.)
 * and auto-discovers tools and resources.
 *
 * Convention:
 * - `export async function GET()` → MCP resource (auto-discovered)
 * - `export async function POST()` → MCP tool (auto-discovered)
 * - Optional: `GET.resource = { description: "..." }`
 * - Optional: `POST.tool = { description: "...", inputSchema: z.object({...}) }`
 */
const parseRouteFile = async (
  filePath: string,
  appDir: string
): Promise<{
  tools: DiscoveredTool[];
  resources: DiscoveredResource[];
}> => {
  const source = await readFile(filePath, "utf-8");
  const routePath = filePathToRoutePath(filePath, appDir);
  const name = routePathToName(routePath);
  const tools: DiscoveredTool[] = [];
  const resources: DiscoveredResource[] = [];

  // Auto-discover GET → resource
  if (hasExportedFunction(source, "GET")) {
    const uriTemplate = routePathToUriTemplate(routePath);
    const resourceAssignments = extractPropertyAssignment(source, "resource");
    const description = resourceAssignments.length > 0
      ? extractDescription(resourceAssignments[0].objectSource)
      : "";

    resources.push({
      name,
      description,
      mimeType: "application/json",
      uriTemplate,
      isTemplate: uriTemplate.includes("{"),
    });
  }

  // Auto-discover POST → tool
  if (hasExportedFunction(source, "POST")) {
    // Try: POST.tool = { description, inputSchema: ... }, then chained schema, then empty
    const toolAssignments = extractPropertyAssignment(source, "tool");
    const description = toolAssignments.length > 0
      ? extractDescription(toolAssignments[0].objectSource)
      : "";
    const inputSchema = toolAssignments.length > 0
      ? extractInputSchema(toolAssignments[0].objectSource)
      : extractChainedSchema(source) ?? { type: "object" as const, properties: {} };

    tools.push({
      name,
      description,
      inputSchema,
      routePath,
      method: "POST",
      kind: "route",
    });
  }

  return { tools, resources };
};

/**
 * Scans a "use server" file for server actions with MCP metadata.
 *
 * Supports two patterns:
 * 1. Explicit: `addToCart.tool = { description: "...", inputSchema: z.object({...}) }`
 * 2. Safe-action chain: `.use(mcp({ description: "..." })).inputSchema(z.object({...})).action(...)`
 *    with `withMCP` — the parser extracts description from mcp() and schema from the chain
 */
const parseActionFile = async (
  filePath: string,
): Promise<DiscoveredTool[]> => {
  const source = await readFile(filePath, "utf-8");

  // Must have "use server" directive
  if (!/^["']use server["']/m.test(source)) return [];

  const tools: DiscoveredTool[] = [];

  // Pattern 1: explicit fn.tool = { description, inputSchema }
  const toolAssignments = extractPropertyAssignment(source, "tool");
  for (const { name: actionName, objectSource } of toolAssignments) {
    tools.push({
      name: actionName,
      description: extractDescription(objectSource),
      inputSchema: extractInputSchema(objectSource),
      routePath: `/api/mcp/manifest`,
      method: "POST",
      kind: "action",
      callStyle: "formData",
      sourceFile: filePath,
      exportName: actionName,
    });
  }

  // Pattern 2: safe-action chain — extract schema from .inputSchema(z.object({...}))
  // and description from .use(mcp({ description: "..." }))
  const knownNames = new Set(tools.map((t) => t.name));
  const exportPattern = /export\s+const\s+(\w+)\s*=\s*\w+\s*[\n\r]*\s*\./g;
  let exportMatch;
  while ((exportMatch = exportPattern.exec(source)) !== null) {
    const actionName = exportMatch[1];
    if (knownNames.has(actionName)) continue;

    const safeActionSchema = extractChainedSchema(source);
    if (safeActionSchema) {
      tools.push({
        name: actionName,
        description: extractMcpMiddlewareDescription(source),
        inputSchema: safeActionSchema,
        routePath: `/api/mcp/manifest`,
        method: "POST",
        kind: "action",
        callStyle: "object",
        sourceFile: filePath,
        exportName: actionName,
      });
      knownNames.add(actionName);
    }
  }

  return tools;
};

/**
 * Scans the app directory and builds a complete MCP manifest.
 *
 * Route files are auto-discovered — any exported GET becomes a resource,
 * any exported POST becomes a tool. Server actions need explicit `.tool` metadata.
 */
export const buildManifest = async (
  appDir: string,
  config: WebMCPConfig = {}
): Promise<MCPManifest> => {
  const tools: DiscoveredTool[] = [];
  const resources: DiscoveredResource[] = [];
  const exclude = ["/api/mcp/**", ...(config.exclude ?? [])];

  // Scan route files — auto-discover GET (resources) and POST (tools)
  const routeFiles = await findFiles(appDir, isRouteFile);
  for (const filePath of routeFiles) {
    const routePath = filePathToRoutePath(filePath, appDir);
    if (!matchesPathFilter(routePath, config.paths)) continue;
    if (matchesPathFilter(routePath, exclude)) continue;

    const parsed = await parseRouteFile(filePath, appDir);
    tools.push(...parsed.tools);
    resources.push(...parsed.resources);
  }

  // Scan source files for server actions with .tool metadata
  const allFiles = await findFiles(appDir, isSourceFile);
  for (const filePath of allFiles) {
    if (isRouteFile(filePath)) continue;

    const actionTools = await parseActionFile(filePath);
    tools.push(...actionTools);
  }

  return { tools, resources };
};
