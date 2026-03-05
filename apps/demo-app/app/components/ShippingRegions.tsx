/** Server Component — renders static resource data (same data as MCP resource api/shipping) */
export const ShippingRegions = ({ regions }: { regions: string[] }) => (
  <div
    style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: 16,
    }}
  >
    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--muted)" }}>
      Shipping Regions
    </h3>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {regions.map((region) => (
        <span
          key={region}
          style={{
            background: "var(--border)",
            padding: "4px 12px",
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          {region}
        </span>
      ))}
    </div>
  </div>
);
