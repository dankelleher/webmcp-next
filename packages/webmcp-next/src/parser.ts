import type { JsonSchema } from "./types.js";

/**
 * Extracts property assignments like `functionName.tool = { ... }`
 * or `functionName.resource = { ... }` from source text.
 *
 * Returns all matches with the identifier name and the object source.
 */
export const extractPropertyAssignment = (
  source: string,
  propName: string
): Array<{ name: string; objectSource: string }> => {
  const results: Array<{ name: string; objectSource: string }> = [];

  // Match: <identifier>.<propName> = {
  const pattern = new RegExp(
    `(\\w+)\\.${propName}\\s*=\\s*`,
    "gm"
  );
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const name = match[1];
    const searchStart = match.index + match[0].length;
    const braceIndex = source.indexOf("{", searchStart);
    if (braceIndex === -1) continue;

    const objectSource = extractBalancedBraces(source, braceIndex);
    if (objectSource) {
      results.push({ name, objectSource });
    }
  }

  return results;
};

/**
 * Checks whether a source file exports a named function (e.g. GET, POST).
 * Handles `export async function GET()`, `export function GET()`,
 * and `export const GET =`.
 */
export const hasExportedFunction = (
  source: string,
  name: string
): boolean => {
  const pattern = new RegExp(
    `export\\s+(?:async\\s+)?(?:function\\s+${name}\\s*\\(|const\\s+${name}\\s*=)`,
    "m"
  );
  return pattern.test(source);
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
  const match = /description\s*:\s*["'`]([^"'`]*)["'`]/.exec(objectSource);
  return match?.[1] ?? "";
};

/**
 * Parses a Zod schema definition like `z.object({ name: z.string().describe("..."), ... })`
 * and converts it to JSON Schema.
 */
export const parseZodSchema = (objectSource: string): JsonSchema | undefined => {
  const zodMatch = /inputSchema\s*:\s*z\.object\s*\(/.exec(objectSource);
  if (!zodMatch) return undefined;

  const schemaStart =
    zodMatch.index + zodMatch[0].length - 1;
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

  let i = start + 1;
  while (i < source.length && source[i] !== "{") i++;
  return extractBalancedBraces(source, i);
};

/** Parses the inner content of a z.object({...}) into JSON Schema properties */
const parseZodObjectInner = (inner: string): JsonSchema => {
  const properties: JsonSchema["properties"] = {};
  const required: string[] = [];

  const content = inner.slice(1, -1).trim();

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
    schemaMatch.index + schemaMatch[0].length - 1;
  const schemaSource = extractBalancedBraces(objectSource, start);
  if (!schemaSource) return undefined;

  const jsonish = schemaSource
    .replace(/(\w+)\s*:/g, '"$1":')
    .replace(/'/g, '"')
    .replace(/,\s*(}|])/g, "$1")
    .replace(/\bundefined\b/g, "null");

  try {
    return JSON.parse(jsonish) as JsonSchema;
  } catch {
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
 * Extracts a Zod schema from a builder chain method call like
 * `.inputSchema(z.object({...}))` (next-safe-action) or
 * `.body(z.object({...}))` (next-zod-route).
 *
 * Searches for the first matching method call and returns its JSON Schema.
 */
export const extractChainedSchema = (source: string): JsonSchema | undefined => {
  // Try each known schema method: .inputSchema(), .body(), .query(), .params()
  const methods = ["inputSchema", "body", "query", "params"];
  const schemas: JsonSchema[] = [];

  for (const method of methods) {
    const pattern = new RegExp(`\\.${method}\\s*\\(\\s*z\\.object\\s*\\(`);
    const match = pattern.exec(source);
    if (!match) continue;

    const zObjectStart = source.indexOf("z.object(", match.index);
    if (zObjectStart === -1) continue;

    const parenStart = zObjectStart + "z.object".length;
    const innerBraces = extractAfterParen(source, parenStart);
    if (!innerBraces) continue;

    const schema = parseZodObjectInner(innerBraces);
    schemas.push(schema);
  }

  if (schemas.length === 0) return undefined;
  if (schemas.length === 1) return schemas[0];

  // Merge multiple schemas (e.g. .body() + .query()) into one
  const merged: JsonSchema = { type: "object", properties: {} };
  const required: string[] = [];
  for (const schema of schemas) {
    Object.assign(merged.properties, schema.properties);
    if (schema.required) required.push(...schema.required);
  }
  if (required.length > 0) merged.required = required;
  return merged;
};

/** Extracts the identifier referenced by `data:` in an object literal (e.g. `data: cartData` → "cartData") */
export const extractDataReference = (objectSource: string): string | undefined => {
  const match = /data\s*:\s*(\w+)/.exec(objectSource);
  return match?.[1];
};

/**
 * Extracts all exported function and const names from source code.
 * Matches `export async function X(`, `export function X(`, and `export const X =`.
 */
export const extractAllExportNames = (source: string): string[] => {
  const names: string[] = [];
  const pattern = /export\s+(?:async\s+)?(?:function\s+(\w+)\s*\(|const\s+(\w+)\s*=)/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const name = match[1] ?? match[2];
    if (!names.includes(name)) names.push(name);
  }
  return names;
};

/**
 * Extracts the description from a `.use(mcp({ description: "..." }))` call
 * in a safe-action builder chain.
 */
export const extractMcpMiddlewareDescription = (source: string): string => {
  const match = /\.use\s*\(\s*mcp\s*\(\s*\{[^}]*description\s*:\s*["'`]([^"'`]*)["'`]/.exec(source);
  return match?.[1] ?? "";
};
