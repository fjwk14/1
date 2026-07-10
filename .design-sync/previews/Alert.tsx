import React from "react";
import { Alert } from "meridian-ui";

const Stack = (p: { children: React.ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 440 }}>
    {p.children}
  </div>
);

export const Tones = () => (
  <Stack>
    <Alert tone="info" title="Heads up">
      A new version of the dashboard is available.
    </Alert>
    <Alert tone="success" title="Payment received">
      Your invoice for November has been paid in full.
    </Alert>
    <Alert tone="warning" title="Usage nearing limit">
      You have used 92% of your monthly API quota.
    </Alert>
    <Alert tone="danger" title="Deployment failed">
      The build could not be completed. Check the logs for details.
    </Alert>
  </Stack>
);

export const TitleOnly = () => (
  <Stack>
    <Alert tone="success" title="All changes saved" />
    <Alert tone="warning" title="Your session will expire in 5 minutes" />
  </Stack>
);

export const DescriptionOnly = () => (
  <Stack>
    <Alert tone="info">
      Tip: press <strong>⌘K</strong> to open the command palette from anywhere.
    </Alert>
  </Stack>
);
