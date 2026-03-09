import { db } from "./db";
import { StoreFront } from "./components/StoreFront";
import { ShippingRegions } from "./components/ShippingRegions";
import { McpPanel } from "./components/McpPanel";
import { CartDropdown } from "./components/Cart";
import { CartServer } from "./components/CartServer";

/** Force dynamic rendering so the server component always has fresh data */
export const dynamic = "force-dynamic";

export default function Home() {
  const products = db.products.findMany();
  const shippingRegions = db.shippingRegions;

  const cartItems = db.cart.items();
  const cartTotal = cartItems.reduce((sum, item) => {
    const product = db.products.findById(item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>webmcp-next demo</h1>
          </div>
          <CartDropdown key={`cart-${cartItems.length}-${cartTotal}`} count={cartItems.length} total={cartTotal}>
            <CartServer />
          </CartDropdown>
        </div>

        <StoreFront products={products} />
        <ShippingRegions regions={shippingRegions} />
      </main>

      <aside style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <McpPanel />
      </aside>
    </div>
  );
}
