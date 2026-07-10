import React from "react";
import { Avatar } from "meridian-ui";

const Row = (p: { children: React.ReactNode }) => (
  <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
    {p.children}
  </div>
);

// Inline SVG data-URI portraits so the cards render deterministically offline.
const face = (bg: string, initials: string) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' fill='${bg}'/><text x='50%' y='54%' font-family='sans-serif' font-size='40' fill='white' text-anchor='middle' dominant-baseline='middle'>${initials}</text></svg>`
  );

export const Initials = () => (
  <Row>
    <Avatar name="Aria Chen" />
    <Avatar name="Marcus Webb" />
    <Avatar name="Priya Nair" />
    <Avatar initials="JD" />
  </Row>
);

export const Image = () => (
  <Row>
    <Avatar src={face("#4f46e5", "AC")} name="Aria Chen" />
    <Avatar src={face("#0f766e", "MW")} name="Marcus Webb" />
    <Avatar src={face("#b45309", "PN")} name="Priya Nair" />
  </Row>
);

export const Sizes = () => (
  <Row>
    <Avatar name="Aria Chen" size="xs" />
    <Avatar name="Aria Chen" size="sm" />
    <Avatar name="Aria Chen" size="md" />
    <Avatar name="Aria Chen" size="lg" />
  </Row>
);

export const WithStatus = () => (
  <Row>
    <Avatar name="Aria Chen" status="online" />
    <Avatar name="Marcus Webb" status="busy" />
    <Avatar name="Priya Nair" status="offline" />
  </Row>
);

export const Square = () => (
  <Row>
    <Avatar src={face("#4f46e5", "AC")} name="Aria Chen" square />
    <Avatar name="Team" square />
  </Row>
);
