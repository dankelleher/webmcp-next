import type { JsonSchema } from "./types.js";

/**
 * Extracts the value of a named export from TypeScript source text.
 * Returns the raw source text of the object literal.
 *
 * e.g. for `export const tool: ToolDefinition = { description: "...", ... };`
 * returns `{ description: "...", ... }`
 */
export const extractExportObject = (
  source: string,
  exportName: string
): string | undefined => {
  // Match `export const <name>` followed by optional type annotation, then `=`
  const pattern = new RegExp(
    `export\\s+const\\s+${exportName}\\s*(?::[^=]*)?=\\s*`,
    "m"
  );
  const match = pattern.exec(source);
  if (!match) return undefined;

  const start = match.index + match[0].length;
  // Find the matching closing brace
  return extractBalancedBraces(source, start);
};

/** Extracts a balanced `{ ... }` block from source starting at the given position */
const extractBalancedBraces = (
  source: string,
  start: number
): string | undefined => {
  if (source[start] !== "{") return undefined;

  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return undefined;
};

/** Extracts the `description` string from an object literal source */
export const extractDescription = (objectSource: string): string => {
  // Match description: "..." or description: '...' or description: `...`
  const match = /description\s*:\s*["'`]([^"'`]*)["'`]/.exec(objectSource);
  return match?.[1] ?? "";
};

/** Extracts the `mimeType` string from an object literal source */
export const extractMimeType = (objectSource: string): string => {
  const match = /mimeType\s*:\s*["'`]([^"'`]*)["'`]/.exec(objectSource);
  return match?.[1] ?? "application/json";
};

/**
 * Parses a Zod schema definition like `z.object({ name: z.string().describe("..."), ... })`
 * and converts it to JSON Schema.
 */
export const parseZodSchema = (objectSource: string): JsonSchema | undefined => {
  // Find z.object({...}) in the inputSchema value
  const zodMatch = /inputSchema\s*:\s*z\.object\s*\(/.exec(objectSource);
  if (!zodMatch) return undefined;

  const schemaStart =
    zodMatch.index + zodMatch[0].length - 1; // position of the `(`
  const innerBraces = extractAfterParen(objectSource, schemaStart);
  if (!innerBraces) return undefined;

  return parseZodObjectInner(innerBraces);
};

/** Extracts content between matching parentheses, returning the inner braces content */
const extractAfterParen = (
  source: string,
  start: number
): string | undefined => {
  if (source[start] !== "(") return undefined;

  // Find the `{` after `(`
  let i = start + 1;
  while (i < source.length && source[i] !== "{") i++;
  return extractBalancedBraces(source, i);
};

/** Parses the inner content of a z.object({...}) into JSON Schema properties */
const parseZodObjectInner = (inner: string): JsonSchema => {
  const properties: JsonSchema["properties"] = {};
  const required: string[] = [];

  // Strip outer braces
  const content = inner.slice(1, -1).trim();

  // Match patterns like: propertyName: z.string().describe("...")
  const propPattern =
    /(\w+)\s*:\s*z\.(\w+)\(\)([^,}]*)/g;
  let match;

  while ((match = propPattern.exec(content)) !== null) {
    const [, propName, zodType, chain] = match;

    const typeMap: Record<string, string> = {
      string: "string",
      number: "number",
      boolean: "boolean",
      array: "array",
    };

    const description = /\.describe\(\s*["'`]([^"'`]*)["'`]\s*\)/.exec(chain);
    const isOptional = chain.includes(".optional()");

    properties[propName] = {
      type: typeMap[zodType] ?? "string",
      ...(description ? { description: description[1] } : {}),
    };

    if (!isOptional) {
      required.push(propName);
    }
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
};

/**
 * Parses an inline JSON Schema object literal from the source.
 * Handles `inputSchema: { type: "object", properties: { ... } }`
 */
export const parseInlineJsonSchema = (
  objectSource: string
): JsonSchema | undefined => {
  const schemaMatch = /inputSchema\s*:\s*\{/.exec(objectSource);
  if (!schemaMatch) return undefined;

  const start =
    schemaMatch.index + schemaMatch[0].length - 1; // position of `{`
  const schemaSource = extractBalancedBraces(objectSource, start);
  if (!schemaSource) return undefined;

  // Convert JS object literal to JSON-ish string
  const jsonish = schemaSource
    .replace(/(\w+)\s*:/g, '"$1":') // quote keys
    .replace(/'/g, '"') // single to double quotes
    .replace(/,\s*(}|])/g, "$1") // trailing commas
    .replace(/\bundefined\b/g, "null");

  try {
    return JSON.parse(jsonish) as JsonSchema;
  } catch {
    // Fallback: return a minimal schema
    return { type: "object", properties: {} };
  }
};

/** Extracts inputSchema from a tool export, trying Zod first then inline JSON Schema */
export const extractInputSchema = (objectSource: string): JsonSchema => {
  const zodSchema = parseZodSchema(objectSource);
  if (zodSchema) return zodSchema;

  const jsonSchema = parseInlineJsonSchema(objectSource);
  if (jsonSchema) return jsonSchema;

  return { type: "object", properties: {} };
};

/**
 * Determines whether a resource's `data` field is a function (dynamic) or a value (static).
 * Also extracts parameter names from function signatures.
 */
export const analyzeResourceData = (
  objectSource: string
): { isFunction: boolean; paramNames: string[] } => {
  // Check for arrow function or async function patterns in data field
  const funcMatch =
    /data\s*:\s*(?:async\s+)?\(([^)]*)\)\s*=>/.exec(objectSource) ??
    /data\s*:\s*(?:async\s+)?function\s*\(([^)]*)\)/.exec(objectSource);

  if (!funcMatch) return { isFunction: false, paramNames: [] };

  const params = funcMatch[1].trim();
  if (!params) return { isFunction: true, paramNames: [] };

  // Extract param names (strip type annotations)
  const paramNames = params
    .split(",")
    .map((p) => p.trim().split(/\s*[:.?]/)[0].trim())
    .filter(Boolean);

  return { isFunction: true, paramNames };
};
