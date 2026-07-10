import React from "react";
import { Badge } from "meridian-ui";

const Row = (p: { children: React.ReactNode }) => (
  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
    {p.children}
  </div>
);

export const Tones = () => (
  <Row>
    <Badge tone="neutral">Draft</Badge>
    <Badge tone="primary">Beta</Badge>
    <Badge tone="success">Active</Badge>
    <Badge tone="warning">Pending</Badge>
    <Badge tone="danger">Failed</Badge>
    <Badge tone="info">New</Badge>
  </Row>
);

export const WithDot = () => (
  <Row>
    <Badge tone="success" dot>Online</Badge>
    <Badge tone="warning" dot>Degraded</Badge>
    <Badge tone="danger" dot>Offline</Badge>
    <Badge tone="neutral" dot>Idle</Badge>
  </Row>
);

export const Square = () => (
  <Row>
    <Badge tone="primary" square>v2.1.0</Badge>
    <Badge tone="neutral" square>ESM</Badge>
    <Badge tone="info" square>TypeScript</Badge>
  </Row>
);
