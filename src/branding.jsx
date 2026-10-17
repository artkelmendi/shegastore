import React, { useId } from "react";
import { wolfMarkup, wolfWordmarkMarkup } from "./wolf-artwork";

export function WolfWordmark({ className = "" }) {
  return (
    <svg
      viewBox="0 0 1165 465"
      className={`wolf-artwork ${className}`}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: wolfWordmarkMarkup }}
    />
  );
}

// Undo the ticket's tilt while keeping the two approved eye contours intact.
const eyeContours = [
  ...wolfMarkup.matchAll(
    /<polygon\b[^>]*class="wolf-eye"[^>]*points="([^"]+)"/g,
  ),
].map((match) =>
  match[1]
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return [
        x * Math.cos(-Math.PI / 6) - y * Math.sin(-Math.PI / 6),
        x * Math.sin(-Math.PI / 6) + y * Math.cos(-Math.PI / 6),
      ];
    }),
);
const eyePoints = eyeContours.flat();
const eyeBounds = [
  Math.min(...eyePoints.map(([x]) => x)),
  Math.min(...eyePoints.map(([, y]) => y)),
  Math.max(...eyePoints.map(([x]) => x)),
  Math.max(...eyePoints.map(([, y]) => y)),
];
export function WolfEyes() {
  return (
    <svg
      className="wolf-eyes-artwork"
      viewBox={`${eyeBounds[0]} ${eyeBounds[1]} ${eyeBounds[2] - eyeBounds[0]} ${eyeBounds[3] - eyeBounds[1]}`}
      aria-hidden="true"
    >
      {eyeContours.map((points, index) => (
        <polygon
          key={index}
          className="wolf-eye"
          fill="#FF0033"
          points={points.map((point) => point.join(",")).join(" ")}
        />
      ))}
    </svg>
  );
}

export function WolfArtwork({ className = "", ...props }) {
  const id = useId().replace(/[^a-z0-9]/gi, "");
  const markup = wolfMarkup.replaceAll(
    "Transparent_clearance_behind_O",
    `wolf-${id}-clearance`,
  );
  return (
    <svg
      viewBox="0 0 1165 970"
      className={`wolf-artwork ${className}`}
      aria-hidden="true"
      {...props}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
