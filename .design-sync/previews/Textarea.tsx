import React from "react";
import { Textarea } from "meridian-ui";

const Box = (p: { children: React.ReactNode }) => (
  <div style={{ maxWidth: 380 }}>{p.children}</div>
);

export const WithLabel = () => (
  <Box>
    <Textarea
      label="Description"
      placeholder="Describe your project…"
      hint="Markdown is supported."
      defaultValue="A calm, professional design system for data-dense dashboards."
    />
  </Box>
);

export const WithError = () => (
  <Box>
    <Textarea
      label="Release notes"
      required
      defaultValue=""
      error="Release notes are required before publishing."
    />
  </Box>
);

export const Disabled = () => (
  <Box>
    <Textarea
      label="Audit log"
      disabled
      defaultValue={"2025-11-04 09:12  user.login\n2025-11-04 09:15  project.create\n2025-11-04 09:18  member.invite"}
    />
  </Box>
);
