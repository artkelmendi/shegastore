import { copyFile, mkdir } from "node:fs/promises";
import { products } from "../src/data.js";

// Preserve direct links on static hosts, including hosts without SPA rewrites.
const routes = [
  "shop",
  "faq",
  "brands",
  "contact",
  "about",
  "saved",
  "delivery",
  "privacy",
  ...products.map((p) => `product/${p.id}`),
];
for (const route of routes) {
  const directory = new URL(`../dist/${route}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  await copyFile(
    new URL("../dist/index.html", import.meta.url),
    new URL("index.html", directory),
  );
}
await copyFile(
  new URL("../dist/index.html", import.meta.url),
  new URL("../dist/404.html", import.meta.url),
);
console.log(`Prepared ${routes.length} static page entry points.`);
