/**
 * Wraps a next-safe-action client or next-zod-route builder so that input
 * schemas are automatically captured and attached to the returned handler
 * as `.tool = { inputSchema }`.
 *
 * Works with both libraries:
 *
 * ```ts
 * // next-safe-action
 * import { createSafeActionClient } from "next-safe-action";
 * import { withMCP, mcp } from "webmcp-next";
 * export const actionClient = withMCP(createSafeActionClient());
 *
 * // next-zod-route
 * import { createZodRoute } from "next-zod-route";
 * import { withMCP } from "webmcp-next";
 * export const route = withMCP(createZodRoute());
 * ```
 *
 * Captured schemas:
 * - `.inputSchema(z)` (next-safe-action)
 * - `.body(z)`, `.query(z)`, `.params(z)` (next-zod-route)
 *
 * Terminal methods that trigger attachment:
 * - `.action()`, `.stateAction()` (next-safe-action)
 * - `.handler()` (next-zod-route)
 *
 * MCP metadata (description) can be added via the `.use(mcp({...}))` pattern:
 * ```ts
 * export const addToCart = actionClient
 *   .use(mcp({ description: "Add a product to the shopping cart" }))
 *   .inputSchema(z.object({ productId: z.string(), quantity: z.number() }))
 *   .action(async ({ parsedInput }) => { ... });
 * ```
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Marker symbol to identify mcp() middleware */
const MCP_META = Symbol.for("webmcp-next:meta");

/** Methods that define input schemas */
const SCHEMA_METHODS = new Set(["inputSchema", "body", "query", "params"]);

/** Terminal methods that produce the final handler/action */
const TERMINAL_METHODS = new Set(["action", "stateAction", "handler"]);

/** MCP metadata that can be attached to an action or route handler */
export interface MCPMeta {
  description?: string;
  tool?: { inputSchema: unknown };
}

interface ChainState {
  schemas: Map<string, unknown>;
  meta: MCPMeta;
}

/** Merges multiple Zod object schemas into one combined schema */
const mergeSchemas = (schemas: Map<string, unknown>): unknown => {
  if (schemas.size === 0) return undefined;
  if (schemas.size === 1) return [...schemas.values()][0];

  // Combine by merging .shape from each schema
  const merged: Record<string, unknown> = {};
  for (const schema of schemas.values()) {
    const def = (schema as any)?._def;
    const shape =
      typeof def?.shape === "function" ? def.shape() : def?.shape;
    if (shape) Object.assign(merged, shape);
  }

  // Reconstruct a z-like shape descriptor for the parser
  // The runtime schema is used by withMCP; the parser handles source extraction
  const first = [...schemas.values()][0] as any;
  if (typeof first?.extend === "function") {
    // Zod: build a new z.object from the merged shape
    let combined = first.pick({});
    for (const schema of schemas.values()) {
      combined = combined.merge(schema as any);
    }
    return combined;
  }

  return [...schemas.values()][0];
};

const wrapChain = (obj: any, state: ChainState): any =>
  new Proxy(obj, {
    get(target, prop) {
      const val = target[prop];
      if (typeof val !== "function") return val;

      const propStr = String(prop);

      return (...args: any[]) => {
        // .use() — check if the argument is an mcp() middleware
        if (propStr === "use" && args[0]?.[MCP_META]) {
          const mcpMeta: MCPMeta = args[0][MCP_META];
          const result = val.apply(target, args);
          const nextState: ChainState = {
            schemas: new Map(state.schemas),
            meta: { ...state.meta, ...mcpMeta },
          };
          return wrapChain(result, nextState);
        }

        const result = val.apply(target, args);

        // Schema method — capture the schema and continue wrapping
        if (SCHEMA_METHODS.has(propStr)) {
          const nextState: ChainState = {
            schemas: new Map(state.schemas),
            meta: state.meta,
          };
          nextState.schemas.set(propStr, args[0]);
          return wrapChain(result, nextState);
        }

        // Terminal method — attach captured schemas and metadata
        if (TERMINAL_METHODS.has(propStr)) {
          const combined = mergeSchemas(state.schemas);
          if (typeof result === "function") {
            if (combined) {
              (result as any).tool = { inputSchema: combined };
            }
            if (state.meta.description) {
              (result as any).description = state.meta.description;
            }
          }
          return result;
        }

        // Other chainable methods — pass through state
        if (typeof result === "object" && result !== null) {
          return wrapChain(result, state);
        }
        return result;
      };
    },
  });

/**
 * Wraps a next-safe-action client or next-zod-route builder to automatically
 * capture input schemas and MCP metadata for tool discovery.
 *
 * The wrapped client behaves identically — the only difference is that
 * `.tool = { inputSchema }` and `.description` are set on returned
 * actions/handlers at runtime.
 *
 * ```ts
 * import { createSafeActionClient } from "next-safe-action";
 * import { withMCP } from "webmcp-next";
 *
 * export const actionClient = withMCP(createSafeActionClient());
 * ```
 */
export const withMCP = <T>(client: T): T =>
  wrapChain(client, { schemas: new Map(), meta: {} }) as T;

/**
 * Creates a passthrough middleware that carries MCP metadata (e.g. description)
 * through the safe-action chain. Use with `.use()`:
 *
 * ```ts
 * export const addToCart = actionClient
 *   .use(mcp({ description: "Add a product to the shopping cart" }))
 *   .inputSchema(z.object({ productId: z.string(), quantity: z.number() }))
 *   .action(async ({ parsedInput }) => { ... });
 * ```
 */
export const mcp = (meta: MCPMeta) => {
  const middleware = async (opts: Record<string, any>) => opts.next();
  (middleware as any)[MCP_META] = meta;
  return middleware as any;
};
