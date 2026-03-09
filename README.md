# webmcp-next

Turn your Next.js app into an AI-agent-ready website in under a minute. Zero refactoring, no extra backend.

https://github.com/user-attachments/assets/6bfd270a-0e1b-4b65-ae26-03e22b81fc04


## Quick start

```
npm install webmcp-next
```

**1. Wrap your Next.js config:**

```ts
// next.config.ts
import { withWebMCP } from "webmcp-next";
export default withWebMCP()(nextConfig);
```

**2. Add the manifest route:**

```ts
// app/api/mcp/manifest/route.ts
export { GET, POST } from "webmcp-next";
```

**3. Drop in the script component:**

```tsx
// app/layout.tsx
import { WebMCPScript } from "webmcp-next";

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

That's it. POST handlers and server actions become tools, GET handlers become resources — all auto-discovered. Add `.tool` or `.resource` metadata for descriptions and input schemas.

See the [full documentation](packages/webmcp-next) for path filtering, input schemas, next-safe-action integration, and more.

## Packages

| Package | Description |
|---------|-------------|
| [webmcp-next](packages/webmcp-next) | The library |
| [demo-app](apps/demo-app) | E-commerce demo showing all patterns |

## License

MIT
