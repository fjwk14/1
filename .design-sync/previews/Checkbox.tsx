import React from "react";
import { Checkbox } from "meridian-ui";

const Stack = (p: { children: React.ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 380 }}>
    {p.children}
  </div>
);

export const Basic = () => (
  <Stack>
    <Checkbox label="I agree to the terms of service" defaultChecked />
    <Checkbox label="Subscribe to the monthly newsletter" />
  </Stack>
);

export const WithDescription = () => (
  <Stack>
    <Checkbox
      defaultChecked
      label="Email notifications"
      description="Get notified when someone mentions you or assigns you a task."
    />
    <Checkbox
      label="Desktop notifications"
      description="Requires granting permission in your browser."
    />
  </Stack>
);

export const States = () => (
  <Stack>
    <Checkbox label="Checked" defaultChecked />
    <Checkbox label="Indeterminate" indeterminate />
    <Checkbox label="Disabled" disabled />
    <Checkbox label="Disabled & checked" disabled defaultChecked />
  </Stack>
);
