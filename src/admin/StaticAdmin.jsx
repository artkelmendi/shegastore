import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowLeft,
  SquaresFour,
  Tag,
  Stack,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import { products as samples, money } from "../data";
import { Overview, Products } from "./AdminApp";
import { imageUrl } from "../api";
import "./admin.css";
import { ThemeToggle } from "../theme";

// This public build uses only the committed sample catalogue, never local records.
const products = samples.map((p) => ({
  ...p,
  price_cents: Math.round(p.price * 100),
  status: "published",
  variants: p.sizes.map((size) => ({
    id: `${p.id}-${size}`,
    size,
    sku: `${p.id}-${size}`.toUpperCase(),
    tracked: 0,
    on_hand: 0,
    reserved: 0,
  })),
}));
const logo = `${import.meta.env.BASE_URL}logos/wolf-ticket-light.svg`;
function StockPreview() {
  const [query, setQuery] = useState("");
  const rows = products
    .flatMap((p) => p.variants.map((v) => ({ ...v, product: p })))
    .filter((v) =>
      `${v.product.name} ${v.sku}`.toLowerCase().includes(query.toLowerCase()),
    );
  return (
    <>
      <div className="workspace-page-heading">
        <div>
          <p className="workspace-kicker">INVENTORY PREVIEW</p>
          <h1>Stock</h1>
          <p>Sample sizes. Physical quantities have not been confirmed.</p>
        </div>
      </div>
      <div className="workspace-toolbar">
        <label className="workspace-search">
          <input
            aria-label="Search stock"
            placeholder="Search products, sizes or SKU"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span>{rows.length} sizes</span>
      </div>
      <div className="workspace-table-scroll">
        <table className="workspace-table">
          <thead>
            <tr>
              <th>Product / SKU</th>
              <th>Size</th>
              <th>Available</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id}>
                <td>
                  <strong>{v.product.name}</strong>
                  <small>{v.sku}</small>
                </td>
                <td>{v.size}</td>
                <td>—</td>
                <td>Not confirmed</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="workspace-empty">No sizes match your search.</p>
        )}
      </div>
    </>
  );
}
function ProductPreview({ id }) {
  const p = products.find((p) => p.id === id);
  return (
    <>
      <Link to="/admin/products" className="workspace-back">
        <ArrowLeft size={15} />
        Products
      </Link>
      <div className="workspace-page-heading">
        <div>
          <p className="workspace-kicker">READ-ONLY CATALOGUE</p>
          <h1>{p ? "Product details" : "Product creation"}</h1>
          <p>
            {p ? p.name : "Adding products requires the local or hosted API."}
          </p>
        </div>
      </div>
      {p && (
        <div className="workspace-editor">
          <section className="workspace-form-section">
            <h2>{p.name}</h2>
            <p>{p.description}</p>
            <dl className="static-product-details">
              {[
                ["Brand", p.brand],
                ["Category", p.category],
                ["Price", money(p.price)],
                ["Colour", p.color],
                ["Sizes", p.sizes.join(" / ")],
                ["Stock", "Not confirmed"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="workspace-form-section">
            <img
              className="workspace-main-photo"
              src={imageUrl(p.image)}
              alt={p.name}
            />
          </section>
        </div>
      )}
    </>
  );
}
export default function StaticAdmin() {
  const location = useLocation(),
    path = location.pathname.replace(/\/$/, "");
  useEffect(() => {
    document.title = "Admin preview | Wolf Shop";
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [path]);
  if (path === "/login")
    return (
      <main className="workspace-login">
        <div className="workspace-login-brand">
          <Link to="/">
            <img src={logo} width="43" height="43" alt="Wolf Shop" />
          </Link>
          <span>Wolf Shop workspace</span>
          <ThemeToggle />
          <span className="workspace-local">Public preview</span>
        </div>
        <section className="workspace-login-intro">
          <p className="workspace-kicker">WOLF SHOP</p>
          <h1>Behind the store.</h1>
          <p>A look at the catalogue and stock workspace.</p>
        </section>
        <section className="workspace-login-form">
          <div className="workspace-login-topline" />
          <h2>Admin preview</h2>
          <p>
            This static dashboard is public and read-only. Sign-in, changes and
            real stock records require the backend; your local administrator
            credentials are not used here.
          </p>
          <Link className="workspace-primary" to="/admin">
            Open dashboard <ArrowUpRight size={18} />
          </Link>
        </section>
        <footer>
          Wolf Shop<span>Read-only sample catalogue</span>
        </footer>
      </main>
    );
  const page =
    path === "/admin/products" ? (
      <Products products={products} readOnly />
    ) : path.startsWith("/admin/products/") ? (
      <ProductPreview id={path.split("/").at(-1)} />
    ) : path === "/admin/stock" ? (
      <StockPreview />
    ) : path === "/admin/activity" ? (
      <>
        <div className="workspace-page-heading">
          <div>
            <p className="workspace-kicker">WORKSPACE PREVIEW</p>
            <h1>Activity</h1>
            <p>Private staff and stock activity is not published.</p>
          </div>
        </div>
        <div className="workspace-empty">
          <h3>No public activity records.</h3>
          <p>The live activity log stays in the local database.</p>
        </div>
      </>
    ) : (
      <Overview products={products} activity={[]} readOnly />
    );
  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <Link to="/admin" className="workspace-wordmark">
          <img src={logo} alt="Wolf Shop" width="34" height="34" />
          <span>
            Wolf Shop<span>Workspace preview</span>
          </span>
        </Link>
        <ThemeToggle className="workspace-theme" />
        <p className="workspace-local">Public · read only</p>
        <nav aria-label="Workspace navigation">
          {[
            ["/admin", "Overview", SquaresFour],
            ["/admin/products", "Products", Tag],
            ["/admin/stock", "Stock", Stack],
            ["/admin/activity", "Activity", ClockCounterClockwise],
          ].map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === "/admin"}>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="workspace-sidebar-bottom">
          <Link to="/">
            Back to the store <ArrowUpRight size={16} />
          </Link>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <span>Wolf Shop / Admin preview</span>
          <span className="workspace-topbar-note">
            Read-only sample catalogue
          </span>
        </header>
        <main className="workspace-content">
          <div className="workspace-saved static-admin-notice" role="note">
            <strong>Public preview · read only</strong>
            <span>
              Sample catalogue only. Sign-in and editing require a hosted
              backend. No local accounts, uploads or stock records are
              published.
            </span>
          </div>
          {page}
        </main>
        <footer className="workspace-footer">
          Wolf Shop workspace<span>Static preview</span>
        </footer>
      </div>
    </div>
  );
}
