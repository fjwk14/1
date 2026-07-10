import React from "react";
import { Input } from "meridian-ui";

const Box = (p: { children: React.ReactNode }) => (
  <div style={{ maxWidth: 320 }}>{p.children}</div>
);

export const WithLabel = () => (
  <Box>
    <Input label="Work email" type="email" placeholder="you@company.com" hint="We'll never share your email." />
  </Box>
);

export const Required = () => (
  <Box>
    <Input label="Workspace name" required placeholder="Acme Inc." defaultValue="Acme Inc." />
  </Box>
);

export const WithError = () => (
  <Box>
    <Input label="Password" type="password" defaultValue="123" error="Must be at least 8 characters." />
  </Box>
);

export const Disabled = () => (
  <Box>
    <Input label="Account ID" defaultValue="acct_9f2a1c" disabled hint="Assigned automatically." />
  </Box>
);
