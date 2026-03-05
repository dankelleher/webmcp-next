import type { JsonSchema, ToolDefinition } from "./types.js";

/**
 * Checks if a value looks like a Zod schema (duck typing to avoid hard dependency).
 * Zod schemas have a `_def` property and a `safeParse` method.
 */
const isZodSchema = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  "_def" in value &&
  "safeParse" in value;

/**
 * Converts a Zod schema to JSON Schema format.
 * Uses zod-to-json-schema if available, otherwise falls back to
 * Zod's built-in `.describe()` shape inspection.
 */
const zodToJsonSchema = (zodSchema: unknown): JsonSchema => {
  // Zod v3 schemas expose their shape via `_def.shape()`
  const def = (zodSchema as Record<string, unknown>)._def as Record<
    string,
    unknown
  >;
  const shape =
    typeof def.shape === "function"
      ? (def.shape as () => Record<string, Record<string, unknown>>)()
      : (def.shape as Record<string, Record<string, unknown>> | undefined);

  if (!shape) {
    return { type: "object", properties: {} };
  }

  const properties: JsonSchema["properties"] = {};
  const required: string[] = [];

  for (const [key, fieldDef] of Object.entries(shape)) {
    const innerDef = (fieldDef as Record<string, unknown>)._def as Record<
      string,
      unknown
    >;
    const typeName = (innerDef?.typeName as string) ?? "ZodString";

    const typeMap: Record<string, string> = {
      ZodString: "string",
      ZodNumber: "number",
      ZodBoolean: "boolean",
      ZodArray: "array",
    };

    properties[key] = {
      type: typeMap[typeName] ?? "string",
      description: innerDef?.description as string | undefined,
    };

    // If the field is not optional, it's required
    if (typeName !== "ZodOptional") {
      required.push(key);
    }
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
};

/** Resolves the inputSchema from a tool definition, handling both JSON Schema and Zod */
export const resolveInputSchema = (tool: ToolDefinition): JsonSchema => {
  if (isZodSchema(tool.inputSchema)) {
    return zodToJsonSchema(tool.inputSchema);
  }
  return tool.inputSchema as JsonSchema;
};
