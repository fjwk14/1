import React from "react";
import { Card, Button, Badge, Avatar } from "meridian-ui";

export const Basic = () => (
  <div style={{ maxWidth: 360 }}>
    <Card
      title="Project status"
      subtitle="Last updated 4 minutes ago"
      action={<Badge tone="success" dot>Active</Badge>}
    >
      <p style={{ margin: 0, color: "var(--mrd-slate-600)" }}>
        All services are operating normally. The next scheduled maintenance
        window is in 12 days.
      </p>
    </Card>
  </div>
);

export const WithFooter = () => (
  <div style={{ maxWidth: 360 }}>
    <Card
      title="Delete workspace"
      subtitle="This action cannot be undone"
      footer={
        <>
          <Button variant="secondary" size="sm">Cancel</Button>
          <Button variant="danger" size="sm">Delete</Button>
        </>
      }
    >
      <p style={{ margin: 0, color: "var(--mrd-slate-600)" }}>
        Removing this workspace will permanently delete all of its projects,
        members, and history.
      </p>
    </Card>
  </div>
);

export const Interactive = () => (
  <div style={{ maxWidth: 360 }}>
    <Card interactive title="Design tokens" subtitle="12 components">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name="Aria Chen" size="sm" />
        <span style={{ color: "var(--mrd-slate-600)" }}>Maintained by Aria Chen</span>
      </div>
    </Card>
  </div>
);

export const Raised = () => (
  <div style={{ maxWidth: 360, padding: 8, background: "var(--mrd-slate-100)" }}>
    <Card raised title="Monthly revenue" subtitle="November 2025">
      <div style={{ fontSize: 28, fontWeight: 600, color: "var(--mrd-slate-900)" }}>
        $48,290
      </div>
      <div style={{ marginTop: 4 }}>
        <Badge tone="success">+12.4% vs Oct</Badge>
      </div>
    </Card>
  </div>
);
