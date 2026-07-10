import React from "react";
import { Button } from "meridian-ui";

const Row = (p: { children: React.ReactNode }) => (
  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
    {p.children}
  </div>
);

export const Variants = () => (
  <Row>
    <Button variant="primary">Save changes</Button>
    <Button variant="secondary">Cancel</Button>
    <Button variant="ghost">Learn more</Button>
    <Button variant="danger">Delete</Button>
  </Row>
);

export const Sizes = () => (
  <Row>
    <Button size="sm">Small</Button>
    <Button size="md">Medium</Button>
    <Button size="lg">Large</Button>
  </Row>
);

export const WithIcons = () => (
  <Row>
    <Button
      variant="primary"
      leadingIcon={
        <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
        </svg>
      }
    >
      New project
    </Button>
    <Button
      variant="secondary"
      trailingIcon={
        <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M7.3 5.3a1 1 0 011.4 0l4 4a1 1 0 010 1.4l-4 4a1 1 0 11-1.4-1.4L10.6 10 7.3 6.7a1 1 0 010-1.4z" />
        </svg>
      }
    >
      Continue
    </Button>
  </Row>
);

export const States = () => (
  <Row>
    <Button variant="primary" loading>
      Saving
    </Button>
    <Button variant="primary" disabled>
      Disabled
    </Button>
    <Button variant="secondary" disabled>
      Disabled
    </Button>
  </Row>
);
