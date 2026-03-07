# next-webmcp

Turn your Next.js app into an AI-agent-ready website in under a minute. Your existing API routes and server actions automatically become [WebMCP](https://webmcp.dev) tools and resources — zero refactoring, no extra backend.

```
npm install next-webmcp
```

## How to use it

Three steps. That's it.

**1. Wrap your Next.js config:**

```ts
// next.config.ts
import { withWebMCP } from "next-webmcp";
export default withWebMCP()(nextConfig);
```

**2. Add the manifest route (one line):**

```ts
// app/api/mcp/manifest/route.ts
export { GET, POST } from "next-webmcp";
```

**3. Drop in the script component:**

```tsx
// app/layout.tsx
import { WebMCPScript } from "next-webmcp";

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        <WebMCPScript />
      </body>
    </html>
  );
}
```

Done. Your API routes and server actions are automatically exposed to AI agents via `navigator.modelContext` — POST handlers become tools, GET handlers become resources.

## Adding descriptions and schemas

Routes and actions work out of the box, but you can add metadata to help agents understand what they do.

### API route tools (POST handlers)

POST handlers are auto-discovered as tools. Add `.tool` for a description and input schema:

```ts
// app/api/products/search/route.ts
import { z } from "zod";

export async function POST(req: Request) {
  const { query } = await req.json();
  const results = await db.products.search(query);
  return Response.json({ results });
}

// Optional — improves agent understanding
POST.tool = {
  description: "Search products by keyword",
  inputSchema: z.object({
    query: z.string().describe("Search keyword"),
  }),
};
```

### API route resources (GET handlers)

GET handlers are auto-discovered as resources. Add `.resource` for a description:

```ts
// app/api/products/route.ts
export async function GET() {
  return Response.json(await db.products.findMany());
}

GET.resource = { description: "Full product catalog" };
```

Dynamic route segments become MCP resource template URIs automatically:

```ts
// app/api/products/[category]/route.ts → MCP URI: products/{category}
export async function GET(req, { params }) {
  const { category } = await params;
  return Response.json(await db.products.findMany({ category }));
}

GET.resource = { description: "Products filtered by category" };
```

### Server component resources

Server components can expose their data as MCP resources via `.resource` with a `data` function:

```ts
// app/components/CartServer.tsx
export const cartData = () => {
  const items = db.cart.items();
  return { items, total: items.reduce((s, i) => s + i.subtotal, 0) };
};

export const CartServer = () => {
  const { items, total } = cartData();
  return <div>...</div>;
};

CartServer.resource = {
  description: "Current shopping cart contents",
  data: cartData,
};
```

The same data function powers both the UI and the agent.

### Server actions (plain functions)

Server actions with `"use server"` are auto-discovered when they have `.tool` metadata:

```ts
// app/actions/cart.ts
"use server";
import { z } from "zod";

export async function removeFromCart(formData: FormData) {
  const productId = formData.get("productId") as string;
  db.cart.remove(productId);
}

removeFromCart.tool = {
  description: "Remove a product from the shopping cart",
  inputSchema: z.object({
    productId: z.string().describe("The product ID to remove"),
  }),
};
```

### Server actions (next-safe-action)

If you use [next-safe-action](https://next-safe-action.dev), wrap your client with `withMCP` and use the `mcp()` middleware to add descriptions. The input schema is captured automatically from the chain:

```ts
// app/lib/safe-action.ts
import { createSafeActionClient } from "next-safe-action";
import { withMCP } from "next-webmcp";

export const actionClient = withMCP(createSafeActionClient());
```

```ts
// app/actions/cart.ts
"use server";
import { z } from "zod";
import { mcp } from "next-webmcp";
import { actionClient } from "../lib/safe-action";

export const addToCart = actionClient
  .use(mcp({ description: "Add a product to the shopping cart" }))
  .inputSchema(z.object({
    productId: z.string().describe("The product ID to add"),
    quantity: z.number().describe("Number of items to add"),
  }))
  .action(async ({ parsedInput: { productId, quantity } }) => {
    db.cart.add(productId, quantity);
  });
```

## How it works

```
Your Next.js App
+------------------------------------------+
|                                          |
|  API routes (auto-discovered)            |
|    POST handlers ──────────┐  + optional |
|    GET handlers             │  .tool /   |
|                             │  .resource |
|  Server actions             │  metadata  |
|    "use server" files ──────┤            |
|                             │  Scanner   |
|  Server components          │  reads     |
|    .resource = { data } ───┘  source     |
|                                files     |
|              ┌───────────────────┐       |
|              │  MCP Manifest     │       |
|              │  /api/mcp/manifest│       |
|              └────────┬──────────┘       |
|                       │                  |
|  <WebMCPScript /> ────┘                  |
|    fetches manifest, registers with      |
|    navigator.modelContext                 |
+------------------------------------------+
         │                    │
         v                    v
   Browser UI           AI Agent (WebMCP)
   (same code)          (same code)
```

The `withWebMCP()` plugin scans your source files at build time. API routes are auto-discovered — POST handlers become tools, GET handlers become resources. Server actions and component resources are discovered when they have `.tool` or `.resource` metadata. The `<WebMCPScript />` component fetches the manifest and registers everything with `navigator.modelContext`.

## Input schemas

Tools accept either [Zod](https://zod.dev) schemas or plain JSON Schema:

```ts
// Zod (recommended — .describe() becomes the field description)
POST.tool = {
  description: "Add to cart",
  inputSchema: z.object({
    productId: z.string().describe("The product ID"),
    quantity: z.number().describe("How many to add"),
  }),
};

// JSON Schema (works too)
POST.tool = {
  description: "Add to cart",
  inputSchema: {
    type: "object",
    properties: {
      productId: { type: "string", description: "The product ID" },
      quantity: { type: "number", description: "How many to add" },
    },
    required: ["productId", "quantity"],
  },
};
```

## Path filtering

By default, all routes are exposed. To limit visibility:

```ts
export default withWebMCP({
  paths: ["/api/cart/**", "/api/products/**"],
})(nextConfig);
```

To exclude specific paths:

```ts
export default withWebMCP({
  exclude: ["/api/internal/**"],
})(nextConfig);
```

## `/.well-known/mcp`

The plugin automatically rewrites `/.well-known/mcp` to `/api/mcp/manifest`, so server-side MCP clients can discover your tools and resources at the standard location.

## API

### `withWebMCP(config?)`

Wraps your Next.js config. Scans for tools/resources, generates action imports, adds the `/.well-known/mcp` rewrite.

### `GET` / `POST`

Ready-made route handlers for the manifest endpoint. `GET` returns the manifest, `POST` executes server actions by name.

### `<WebMCPScript manifestPath? />`

Client component that fetches the manifest and registers all tools/resources with `navigator.modelContext`. Defaults to `/api/mcp/manifest`.

### `withMCP(client)`

Wraps a next-safe-action client to automatically capture input schemas from builder chains.

### `mcp(meta)`

Passthrough middleware for next-safe-action's `.use()` that carries MCP metadata (description) through the chain.

## Browser support

WebMCP (`navigator.modelContext`) is available in Chrome Canary behind the "Prompt API" flag. The `<WebMCPScript />` component polls for the API, so it works with polyfills too.

## License

MIT
