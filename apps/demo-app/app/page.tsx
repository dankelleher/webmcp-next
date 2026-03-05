import { db } from "./db";
import { StoreFront } from "./components/StoreFront";
import { ShippingRegions } from "./components/ShippingRegions";
import { McpPanel } from "./components/McpPanel";

/**
 * Server Component — fetches data from the same `db` that powers
 * the MCP resources (api/products, api/shipping).
 */
export default function Home() {
  const products = db.products.findMany();
  const shippingRegions = db.shippingRegions;

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "40px 24px",
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        gap: 32,
        alignItems: "start",
      }}
    >
      <main style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>next-webmcp demo</h1>
          <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>
            The UI and MCP tools share the same API routes and data layer
          </p>
        </div>

        <StoreFront products={products} />
        <ShippingRegions regions={shippingRegions} />
      </main>

      <aside style={{ position: "sticky", top: 24 }}>
        <McpPanel />
      </aside>
    </div>
  );
}
