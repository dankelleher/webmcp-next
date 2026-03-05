"use client";

import { useEffect, useState } from "react";

interface ManifestData {
  tools: Array<{
    name: string;
    description: string;
    routePath: string;
    inputSchema: Record<string, unknown>;
  }>;
  resources: Array<{
    name: string;
    description: string;
    uriTemplate: string;
    isTemplate: boolean;
  }>;
}

export const McpPanel = () => {
  const [manifest, setManifest] = useState<ManifestData | null>(null);

  useEffect(() => {
    fetch("/api/mcp/manifest")
      .then((r) => r.json())
      .then(setManifest);
  }, []);

  if (!manifest) return null;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 16,
        fontSize: 13,
        fontFamily: "var(--font-mono)",
      }}
    >
      <h3
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--accent)",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 16,
        }}
      >
        MCP Manifest (auto-generated)
      </h3>

      <div style={{ marginBottom: 16 }}>
        <h4 style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Tools</h4>
        {manifest.tools.map((tool) => (
          <div
            key={tool.name}
            style={{
              background: "var(--bg)",
              borderRadius: "var(--radius)",
              padding: 10,
              marginBottom: 6,
            }}
          >
            <div style={{ color: "var(--success)", fontWeight: 600 }}>{tool.name}</div>
            <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>
              {tool.description}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>
              POST {tool.routePath}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h4 style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Resources</h4>
        {manifest.resources.map((resource) => (
          <div
            key={resource.name}
            style={{
              background: "var(--bg)",
              borderRadius: "var(--radius)",
              padding: 10,
              marginBottom: 6,
            }}
          >
            <div style={{ color: "#f59e0b", fontWeight: 600 }}>{resource.uriTemplate}</div>
            <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>
              {resource.description}
              {resource.isTemplate && (
                <span style={{ color: "var(--accent)", marginLeft: 6 }}>template</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
