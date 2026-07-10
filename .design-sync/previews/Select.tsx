import React from "react";
import { Select } from "meridian-ui";

const Box = (p: { children: React.ReactNode }) => (
  <div style={{ maxWidth: 320 }}>{p.children}</div>
);

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

export const WithOptions = () => (
  <Box>
    <Select label="Role" options={ROLES} defaultValue="member" hint="Controls access level." />
  </Box>
);

export const Placeholder = () => (
  <Box>
    <Select label="Region" placeholder="Select a region…" options={[
      { value: "us", label: "United States" },
      { value: "eu", label: "Europe" },
      { value: "ap", label: "Asia Pacific" },
    ]} />
  </Box>
);

export const WithError = () => (
  <Box>
    <Select label="Plan" required placeholder="Choose a plan…" error="Please select a plan." options={[
      { value: "free", label: "Free" },
      { value: "pro", label: "Pro" },
      { value: "enterprise", label: "Enterprise" },
    ]} />
  </Box>
);

export const Disabled = () => (
  <Box>
    <Select label="Billing currency" options={[{ value: "usd", label: "USD ($)" }]} defaultValue="usd" disabled />
  </Box>
);
