import React from "react";
import { Switch } from "meridian-ui";

const Stack = (p: { children: React.ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 320 }}>
    {p.children}
  </div>
);

export const Basic = () => (
  <Stack>
    <Switch label="Enable two-factor authentication" defaultChecked />
    <Switch label="Public profile" />
  </Stack>
);

export const LabelStart = () => (
  <Stack>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Switch label="Dark mode" labelPosition="start" />
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Switch label="Compact density" labelPosition="start" defaultChecked />
    </div>
  </Stack>
);

export const States = () => (
  <Stack>
    <Switch label="On" defaultChecked />
    <Switch label="Off" />
    <Switch label="Disabled" disabled />
    <Switch label="Disabled & on" disabled defaultChecked />
  </Stack>
);
