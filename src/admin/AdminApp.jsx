import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowLeft,
  Plus,
  MagnifyingGlass,
  SignOut,
  SquaresFour,
  Tag,
  Stack,
  ClockCounterClockwise,
  X,
  UploadSimple,
  Check,
  Eye,
  EyeSlash,
  WarningCircle,
} from "@phosphor-icons/react";
import { api, imageUrl } from "../api";
import { useCatalog } from "../catalog";
import "./admin.css";
import { ThemeToggle } from "../theme";
const euro = (cents) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
const date = (value) =>
  new Date(value.replace(" ", "T") + "Z").toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
const logo = `${import.meta.env.BASE_URL}logos/wolf-ticket-light.svg`;
const blank = {
  name: "",
  id: "",
  brand: "BOSS",
  category: "T-Shirts",
  price_cents: 4500,
  compare_at_cents: null,
  status: "draft",
  description: "",
  color: "Black",
  hex: "#222222",
  image: "",
  gallery: [],
  fresh: false,
};
const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
function ErrorNote({ children }) {
  return children ? (
    <p className="workspace-error" role="alert">
      <WarningCircle size={18} />
      {children}
    </p>
  ) : null;
}
function Status({ status }) {
  return (
    <span className={`workspace-status status-${status}`}>
      {status === "published"
        ? "Published"
        : status === "archived"
          ? "Archived"
          : "Draft"}
    </span>
  );
}
function Modal({ title, children, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current;
    const trigger = document.activeElement;
    el.showModal();
    return () => {
      el.close();
      trigger?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="workspace-modal"
      aria-labelledby="workspace-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      data-lenis-prevent
    >
      <div className="workspace-modal-heading">
        <h2 id="workspace-dialog-title">{title}</h2>
        <button onClick={onClose} aria-label="Close adjustment">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Login({ session, onSignedIn, onRetry, offline }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const setup = !session.configured && session.setupAllowed;
  const field = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  async function submit(e) {
    e.preventDefault();
    setError("");
    if (setup && form.password !== form.confirm) {
      setError("The passphrases do not match.");
      return;
    }
    setPending(true);
    try {
      const data = await api(`/auth/${setup ? "setup" : "login"}`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      onSignedIn(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="workspace-login">
      <div className="workspace-login-brand">
        <Link to="/" aria-label="Back to Wolf Shop">
          <img src={logo} width="43" height="43" alt="Wolf Shop" />
        </Link>
        <span>Wolf Shop workspace</span>
        <ThemeToggle />
        <span className="workspace-local">Local workspace</span>
      </div>
      <section className="workspace-login-intro">
        <p className="workspace-kicker">BEHIND THE STORE</p>
        <h1>
          Good pieces.
          <br />
          All in order.
        </h1>
        <p>
          One place for the catalogue,
          <br />
          every size, and what’s in stock.
        </p>
        <div className="workspace-login-note">
          <span>01 / STAFF ACCESS</span>
          <Link to="/">
            Visit the store <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      <section className="workspace-login-form">
        <div className="workspace-login-topline" />
        <p className="workspace-kicker">WOLF SHOP</p>
        <h2>{setup ? "Set up your workspace" : "Sign in"}</h2>
        <p>
          {setup
            ? "Create the first administrator. There are no default credentials."
            : "Use your staff email and passphrase."}
        </p>
        {offline ? (
          <>
            <ErrorNote>{offline}</ErrorNote>
            <button className="workspace-primary" onClick={onRetry}>
              Try connection again
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            {setup && (
              <label>
                Your name
                <input
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => field("name", e.target.value)}
                  minLength={2}
                  maxLength={80}
                  required
                />
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                value={form.email}
                onChange={(e) => field("email", e.target.value)}
                maxLength={254}
                required
              />
            </label>
            <label>
              Passphrase
              <div className="workspace-password">
                <input
                  type={show ? "text" : "password"}
                  autoComplete={setup ? "new-password" : "current-password"}
                  value={form.password}
                  onChange={(e) => field("password", e.target.value)}
                  minLength={15}
                  maxLength={128}
                  required
                />
                <button
                  type="button"
                  aria-label={show ? "Hide passphrase" : "Show passphrase"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {setup && (
              <>
                <p className="workspace-field-note">
                  Use at least 15 characters. A short sentence works well.
                </p>
                <label>
                  Confirm passphrase
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={form.confirm}
                    onChange={(e) => field("confirm", e.target.value)}
                    minLength={15}
                    maxLength={128}
                    required
                  />
                </label>
              </>
            )}
            <ErrorNote>{error}</ErrorNote>
            <button className="workspace-primary" disabled={pending}>
              {pending
                ? "Please wait…"
                : setup
                  ? "Create administrator"
                  : "Sign in"}
              <ArrowUpRight size={18} />
            </button>
          </form>
        )}
        <p className="workspace-login-help">
          {setup
            ? "Initial setup is available in this local workspace only."
            : "Need staff access? Ask the store owner."}
        </p>
      </section>
      <footer>
        Wolf Shop <span>Products / Sizes / Stock</span>
      </footer>
    </main>
  );
}
function ProductTable({ products, compact = false, readOnly = false }) {
  return (
    <div className="workspace-table-scroll">
      <table className="workspace-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Status</th>
            {!compact && <th>Category</th>}
            <th>Stock</th>
            <th className="number">Price</th>
            <th>
              <span className="sr-only">Edit</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const confirmed = p.variants.filter((v) => v.tracked);
            const count = confirmed.reduce(
              (n, v) => n + v.on_hand - v.reserved,
              0,
            );
            return (
              <tr key={p.id}>
                <td>
                  <Link
                    className="workspace-product-link"
                    to={`/admin/products/${p.id}`}
                  >
                    <img
                      src={imageUrl(p.image)}
                      alt=""
                      width="42"
                      height="52"
                    />
                    <span>
                      <strong>{p.name}</strong>
                      <small>{p.brand}</small>
                    </span>
                  </Link>
                </td>
                <td>
                  <Status status={p.status} />
                </td>
                {!compact && <td>{p.category}</td>}
                <td>
                  {confirmed.length === p.variants.length ? (
                    <>
                      <span
                        className={count === 0 ? "workspace-stock-empty" : ""}
                      >
                        {count} available
                      </span>
                      <small>{p.variants.length} sizes</small>
                    </>
                  ) : (
                    <>
                      <span className="workspace-unconfirmed">
                        Not confirmed
                      </span>
                      <small>
                        {p.variants.length - confirmed.length} sizes need a
                        count
                      </small>
                    </>
                  )}
                </td>
                <td className="number">{euro(p.price_cents)}</td>
                <td>
                  <Link
                    className="workspace-row-edit"
                    to={`/admin/products/${p.id}`}
                    aria-label={`${readOnly ? "View" : "Edit"} ${p.name}`}
                  >
                    {readOnly ? "View" : "Edit"} <ArrowUpRight size={15} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!products.length && (
        <div className="workspace-empty">
          <h3>No products here.</h3>
          <p>Try a different search or add a piece to the catalogue.</p>
        </div>
      )}
    </div>
  );
}
export function Overview({ products, activity, readOnly = false }) {
  const variants = products.flatMap((p) => p.variants),
    unconfirmed = variants.filter((v) => !v.tracked).length;
  return (
    <>
      <div className="workspace-page-heading">
        <div>
          <p className="workspace-kicker">STORE OVERVIEW</p>
          <h1>Store overview</h1>
          <p>Your catalogue, with the details that need attention.</p>
        </div>
        <Link
          className="workspace-primary"
          to={readOnly ? "/admin/products" : "/admin/products/new"}
        >
          <Plus size={17} />
          {readOnly ? "View products" : "Add product"}
        </Link>
      </div>
      <div className="workspace-metrics">
        {[
          [
            products.filter((p) => p.status !== "archived").length,
            "Products",
            "in the catalogue",
          ],
          [
            products.filter((p) => p.status === "published").length,
            "Published",
            readOnly
              ? "visible in the sample store"
              : "visible in the local store",
          ],
          [
            variants
              .filter((v) => v.tracked)
              .reduce((n, v) => n + v.on_hand - v.reserved, 0),
            "Confirmed units",
            "available across tracked sizes",
          ],
          [unconfirmed, "Sizes to count", "availability not yet confirmed"],
        ].map(([n, label, note]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{n}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      {unconfirmed > 0 && (
        <div className="workspace-attention">
          <div>
            <span className="workspace-kicker">START WITH THE STOCK</span>
            <h2>{unconfirmed} sizes need a first count.</h2>
            <p>
              The sample catalogue is imported. No physical stock quantities
              have been assumed.
            </p>
          </div>
          <Link className="workspace-text-link" to="/admin/stock">
            Open stock <ArrowUpRight size={18} />
          </Link>
        </div>
      )}
      <div className="workspace-section-title">
        <h2>Recent products</h2>
        <Link to="/admin/products">
          All products <ArrowUpRight size={16} />
        </Link>
      </div>
      <ProductTable
        products={products.slice(0, 5)}
        compact
        readOnly={readOnly}
      />
      <div className="workspace-section-title">
        <h2>Latest changes</h2>
        <Link to="/admin/activity">
          View activity <ArrowUpRight size={16} />
        </Link>
      </div>
      <Activity activity={activity.slice(0, 4)} compact />
    </>
  );
}
export function Products({ products, readOnly = false }) {
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("all");
  const filtered = products.filter(
    (p) =>
      (status === "all" || p.status === status) &&
      `${p.name} ${p.brand} ${p.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="workspace-page-heading">
        <div>
          <p className="workspace-kicker">CATALOGUE</p>
          <h1>Products</h1>
          <p>{products.length} pieces. Keep the details in order.</p>
        </div>
        {!readOnly && (
          <Link className="workspace-primary" to="/admin/products/new">
            <Plus size={17} />
            Add product
          </Link>
        )}
      </div>
      <div className="workspace-toolbar">
        <label className="workspace-search">
          <MagnifyingGlass size={18} />
          <input
            aria-label="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, brand or category"
          />
        </label>
        <select
          aria-label="Product status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <span>{filtered.length} results</span>
      </div>
      <ProductTable products={filtered} readOnly={readOnly} />
    </>
  );
}
function ProductEditor({ product, onSave, allProducts }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(() =>
    product ? { ...product } : { ...blank },
  );
  const [chosen, setChosen] = useState(["S", "M", "L", "XL"]);
  const [price, setPrice] = useState(
    ((product?.price_cents || 4500) / 100).toFixed(2),
  );
  const [compare, setCompare] = useState(
    product?.compare_at_cents
      ? (product.compare_at_cents / 100).toFixed(2)
      : "",
  );
  const [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [uploading, setUploading] = useState(false),
    [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(null);
  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const guardLink = (e) => {
      if (
        !dirty ||
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const link = e.target.closest?.("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.href === location.href) return;
      e.preventDefault();
      e.stopPropagation();
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      setDiscard(
        (url.pathname.slice(base.length) || "/") + url.search + url.hash,
      );
    };
    addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLink, true);
    return () => {
      removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guardLink, true);
    };
  }, [dirty]);
  const change = (key, value) => {
    setDirty(true);
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "name" && !product
        ? {
            id: value
              .toLowerCase()
              .normalize("NFKD")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 80),
          }
        : {}),
    }));
  };
  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("Choose a photo smaller than 4 MB.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await api("/admin/media", {
        method: "POST",
        body: JSON.stringify({ data }),
      });
      setForm((prev) => ({
        ...prev,
        image: prev.image || result.image,
        gallery: [...prev.gallery, result.image],
      }));
      setDirty(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }
  async function submit(e) {
    e.preventDefault();
    setError("");
    if (
      !/^\d+(\.\d{1,2})?$/.test(price) ||
      (compare && !/^\d+(\.\d{1,2})?$/.test(compare))
    ) {
      setError("Enter prices with up to two decimal places.");
      return;
    }
    setPending(true);
    try {
      await api(`/admin/products${product ? `/${product.id}` : ""}`, {
        method: product ? "PATCH" : "POST",
        body: JSON.stringify({
          ...form,
          price_cents: Math.round(Number(price) * 100),
          compare_at_cents: compare ? Math.round(Number(compare) * 100) : null,
          sizes: chosen,
        }),
      });
      setDirty(false);
      await onSave();
      navigate("/admin/products");
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className="workspace-page-heading">
        <div>
          <button
            className="workspace-back"
            onClick={() =>
              dirty
                ? setDiscard("/admin/products")
                : navigate("/admin/products")
            }
          >
            <ArrowLeft size={15} />
            Products
          </button>
          <h1>{product ? "Edit product" : "Add a product"}</h1>
        </div>
        <span className="workspace-unsaved">
          {dirty
            ? "Unsaved changes"
            : product
              ? `Version ${product.version}`
              : "New draft"}
        </span>
      </div>
      <form className="workspace-editor" onSubmit={submit}>
        <div className="workspace-editor-main">
          <section className="workspace-form-section">
            <h2>The piece</h2>
            <label>
              Product name
              <input
                value={form.name}
                onChange={(e) => change("name", e.target.value)}
                minLength={2}
                maxLength={120}
                required
              />
            </label>
            <label>
              URL handle
              <input
                value={form.id}
                onChange={(e) => change("id", e.target.value)}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={80}
                readOnly={!!product}
                required
              />
            </label>
            <div className="workspace-form-row">
              <label>
                Brand
                <select
                  aria-label="Brand"
                  value={form.brand}
                  onChange={(e) => change("brand", e.target.value)}
                >
                  {[
                    "BOSS",
                    "DIESEL",
                    "ARMANI EXCHANGE",
                    "EMPORIO ARMANI",
                    "HUGO",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Category
                <select
                  aria-label="Category"
                  value={form.category}
                  onChange={(e) => change("category", e.target.value)}
                >
                  {[
                    "T-Shirts",
                    "Hoodies",
                    "Sweatshirts",
                    "Knitwear",
                    "Tracksuits",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(e) => change("description", e.target.value)}
                maxLength={3000}
                rows={5}
              />
            </label>
          </section>
          <section className="workspace-form-section">
            <h2>Price & colour</h2>
            <div className="workspace-form-row">
              <label>
                Price · EUR
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setDirty(true);
                  }}
                  required
                />
              </label>
              <label>
                Original price · optional
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={compare}
                  onChange={(e) => {
                    setCompare(e.target.value);
                    setDirty(true);
                  }}
                />
                <small>Shown only when higher than the selling price.</small>
              </label>
            </div>
            <div className="workspace-form-row">
              <label>
                Colour name
                <input
                  value={form.color}
                  onChange={(e) => change("color", e.target.value)}
                  maxLength={40}
                  required
                />
              </label>
              <label>
                Colour swatch
                <input
                  type="color"
                  value={form.hex}
                  onChange={(e) => change("hex", e.target.value)}
                />
              </label>
            </div>
          </section>
          <section className="workspace-form-section">
            <div className="workspace-section-title">
              <h2>Sizes</h2>
              {product && (
                <Link to="/admin/stock">
                  Manage counts <ArrowUpRight size={15} />
                </Link>
              )}
            </div>
            {product ? (
              <div className="workspace-size-list">
                {product.variants.map((v) => (
                  <span key={v.id}>
                    {v.size}
                    <small>
                      {v.tracked
                        ? `${v.on_hand - v.reserved} available`
                        : "Unconfirmed"}
                    </small>
                  </span>
                ))}
              </div>
            ) : (
              <>
                <div className="workspace-size-picker">
                  {sizes.map((size) => (
                    <button
                      type="button"
                      key={size}
                      aria-pressed={chosen.includes(size)}
                      className={chosen.includes(size) ? "selected" : ""}
                      onClick={() => {
                        setChosen((prev) =>
                          prev.includes(size)
                            ? prev.filter((s) => s !== size)
                            : [...prev, size],
                        );
                        setDirty(true);
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <p className="workspace-field-note">
                  New sizes start at zero. Record the first count in Stock.
                </p>
              </>
            )}
          </section>
        </div>
        <aside className="workspace-editor-aside">
          <section className="workspace-form-section">
            <h2>Visibility</h2>
            <label>
              Status
              <select
                aria-label="Status"
                value={form.status}
                onChange={(e) => change("status", e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <p className="workspace-field-note">
              Published pieces appear in the local storefront. Drafts and
              archived pieces stay here.
            </p>
            <label className="workspace-check">
              <input
                type="checkbox"
                checked={!!form.fresh}
                onChange={(e) => change("fresh", e.target.checked)}
              />
              Show in new arrivals
            </label>
          </section>
          <section className="workspace-form-section">
            <h2>Photography</h2>
            {form.image ? (
              <img
                className="workspace-main-photo"
                src={imageUrl(form.image)}
                alt="Main product preview"
              />
            ) : (
              <div className="workspace-photo-empty">
                Add a photo of the piece.
              </div>
            )}
            <label className="workspace-upload">
              <UploadSimple size={18} />
              {uploading ? "Uploading…" : "Upload a photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading || form.gallery.length >= 8}
                onChange={upload}
              />
            </label>
            <p className="workspace-field-note">
              JPEG, PNG or WebP. Up to 4 MB.
            </p>
            {form.gallery.length > 1 && (
              <div className="workspace-photo-list">
                {form.gallery.map((photo, i) => (
                  <button
                    type="button"
                    key={`${photo}-${i}`}
                    className={form.image === photo ? "selected" : ""}
                    onClick={() => change("image", photo)}
                    aria-label={`Use photo ${i + 1} as main image`}
                  >
                    <img src={imageUrl(photo)} alt="" />
                    {form.image === photo && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
            {!form.image && (
              <label>
                Or use a catalogue photo
                <select
                  aria-label="Catalogue photo"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      const p = allProducts.find(
                        (p) => p.id === e.target.value,
                      );
                      change("image", p.image);
                      change("gallery", p.gallery);
                    }
                  }}
                >
                  <option value="">Choose a piece</option>
                  {allProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>
        </aside>
        <div className="workspace-editor-save">
          <ErrorNote>{error}</ErrorNote>
          <div>
            <button
              type="button"
              className="workspace-secondary"
              onClick={() =>
                dirty
                  ? setDiscard("/admin/products")
                  : navigate("/admin/products")
              }
            >
              Cancel
            </button>
            <button
              className="workspace-primary"
              disabled={
                pending ||
                uploading ||
                !form.image ||
                (!product && !chosen.length)
              }
            >
              {pending ? "Saving…" : "Save product"}
              <Check size={17} />
            </button>
          </div>
        </div>
      </form>
      {discard && (
        <Modal title="Leave this edit?" onClose={() => setDiscard(null)}>
          <p>Your unsaved changes will be discarded.</p>
          <div className="workspace-modal-actions">
            <button
              className="workspace-secondary"
              onClick={() => setDiscard(null)}
            >
              Keep editing
            </button>
            <button
              className="workspace-primary"
              onClick={() => navigate(discard)}
            >
              Discard changes
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function Stock({ products, onSave }) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState(null),
    [operation, setOperation] = useState("set"),
    [amount, setAmount] = useState(""),
    [reason, setReason] = useState("Stock count"),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const rows = products
    .filter((p) => p.status !== "archived")
    .flatMap((p) => p.variants.map((v) => ({ ...v, product: p })))
    .filter(
      (v) =>
        `${v.product.name} ${v.sku} ${v.size}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (filter === "all" ||
          (filter === "unconfirmed" && !v.tracked) ||
          (filter === "low" && v.tracked && v.on_hand - v.reserved <= 3)),
    );
  const open = (v) => {
    setSelected(v);
    setOperation("set");
    setAmount(v.tracked ? String(v.on_hand) : "");
    setReason("Stock count");
    setNote("");
    setError("");
  };
  async function save(e) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      await api(`/admin/variants/${selected.id}/stock`, {
        method: "POST",
        body: JSON.stringify({
          operation,
          amount: Number(amount),
          reason,
          note,
          version: selected.version,
        }),
      });
      await onSave();
      setSelected(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className="workspace-page-heading">
        <div>
          <p className="workspace-kicker">INVENTORY</p>
          <h1>Stock</h1>
          <p>One count for every size. Every change recorded.</p>
        </div>
        <Link className="workspace-text-link" to="/admin/activity">
          Stock history <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="workspace-toolbar">
        <label className="workspace-search">
          <MagnifyingGlass size={18} />
          <input
            aria-label="Search stock"
            placeholder="Search products, sizes or SKU"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Stock filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All stock</option>
          <option value="unconfirmed">Needs first count</option>
          <option value="low">Low stock · 3 or fewer</option>
        </select>
        <span>{rows.length} sizes</span>
      </div>
      <div className="workspace-table-scroll">
        <table className="workspace-table workspace-stock-table">
          <thead>
            <tr>
              <th>Product / SKU</th>
              <th>Size</th>
              <th className="number">On hand</th>
              <th className="number">Reserved</th>
              <th className="number">Available</th>
              <th>Count</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id}>
                <td>
                  <strong>{v.product.name}</strong>
                  <small className="workspace-sku">{v.sku}</small>
                </td>
                <td>{v.size}</td>
                <td className="number">{v.tracked ? v.on_hand : "—"}</td>
                <td className="number">{v.reserved}</td>
                <td className="number">
                  {v.tracked ? v.on_hand - v.reserved : "—"}
                </td>
                <td>
                  {v.tracked ? (
                    <span>Confirmed</span>
                  ) : (
                    <span className="workspace-unconfirmed">Not confirmed</span>
                  )}
                </td>
                <td>
                  <button
                    className="workspace-row-edit"
                    onClick={() => open(v)}
                  >
                    Adjust <ArrowUpRight size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="workspace-empty">
            <h3>No sizes match.</h3>
            <p>Try another product or stock filter.</p>
          </div>
        )}
      </div>
      {selected && (
        <Modal
          title="Adjust stock"
          onClose={() => !pending && setSelected(null)}
        >
          <p className="workspace-adjust-product">
            <strong>{selected.product.name}</strong>
            <span>
              {selected.size} / {selected.color}
            </span>
            <small>{selected.sku}</small>
          </p>
          <form onSubmit={save}>
            <div className="workspace-form-row">
              <label>
                Adjustment
                <select
                  aria-label="Adjustment"
                  value={operation}
                  onChange={(e) => setOperation(e.target.value)}
                >
                  <option value="set">Set counted quantity</option>
                  <option value="add">Receive stock</option>
                  <option value="remove">Remove stock</option>
                </select>
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  min={operation === "set" ? 0 : 1}
                  max={1000000}
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </label>
            </div>
            <label>
              Reason
              <select
                aria-label="Reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {[
                  "Stock count",
                  "Delivery received",
                  "Customer return",
                  "Damaged stock",
                  "Correction",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              Note · optional
              <textarea
                rows={3}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="A short reference for the team"
              />
            </label>
            <p className="workspace-field-note">
              Current count:{" "}
              {selected.tracked ? selected.on_hand : "not confirmed"}. Reserved:{" "}
              {selected.reserved}. Saving records who changed the count and why.
            </p>
            <ErrorNote>{error}</ErrorNote>
            <div className="workspace-modal-actions">
              <button
                type="button"
                className="workspace-secondary"
                onClick={() => setSelected(null)}
                disabled={pending}
              >
                Cancel
              </button>
              <button className="workspace-primary" disabled={pending}>
                {pending ? "Saving…" : "Save adjustment"}
                <Check size={17} />
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function Activity({ activity, compact = false, movements = [] }) {
  return (
    <>
      {!compact && (
        <div className="workspace-page-heading">
          <div>
            <p className="workspace-kicker">WORKSPACE RECORD</p>
            <h1>Activity</h1>
            <p>Product edits and stock changes, in order.</p>
          </div>
        </div>
      )}
      {activity.length ? (
        <ol className="workspace-activity">
          {activity.map((a) => (
            <li key={a.id}>
              <span className="workspace-activity-dot" />
              <div>
                <strong>{a.summary}</strong>
                <p>
                  {a.actor || "System"} <span>·</span> {date(a.created_at)}
                </p>
              </div>
              <span className="workspace-activity-type">
                {a.action.startsWith("stock")
                  ? "Stock"
                  : a.action.startsWith("product")
                    ? "Product"
                    : "Account"}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="workspace-empty">
          <h3>No changes yet.</h3>
          <p>Edits and stock adjustments will appear here.</p>
        </div>
      )}
      {!compact && movements.length > 0 && (
        <>
          <div className="workspace-section-title">
            <h2>Stock movements</h2>
          </div>
          <div className="workspace-table-scroll">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Size</th>
                  <th className="number">Change</th>
                  <th className="number">After</th>
                  <th>Reason</th>
                  <th>Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.product}</strong>
                      <small>{date(m.created_at)}</small>
                    </td>
                    <td>{m.size}</td>
                    <td className="number">
                      {m.delta > 0 ? "+" : ""}
                      {m.delta}
                    </td>
                    <td className="number">{m.quantity_after}</td>
                    <td>
                      {m.reason}
                      {m.note && <small>{m.note}</small>}
                    </td>
                    <td>{m.actor || "System"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
export default function AdminApp() {
  const navigate = useNavigate(),
    location = useLocation();
  const { refresh } = useCatalog();
  const [session, setSession] = useState(null),
    [offline, setOffline] = useState(""),
    [products, setProducts] = useState([]),
    [activity, setActivity] = useState([]),
    [movements, setMovements] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const user = session?.user;
  const check = useCallback(async () => {
    setOffline("");
    try {
      setSession(await api("/auth/session"));
    } catch (e) {
      setSession({ user: null, configured: true });
      setOffline(e.message);
    }
  }, []);
  useEffect(() => {
    check();
  }, [check]);
  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true);
      setError("");
      try {
        const [catalog, log] = await Promise.all([
          api("/admin/products"),
          api("/admin/activity"),
        ]);
        setProducts(catalog.products);
        setActivity(log.activity);
        setMovements(log.movements);
      } catch (e) {
        if (e.status === 401) {
          setSession((prev) => ({ ...prev, user: null }));
          navigate("/login", { replace: true });
        } else setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [navigate],
  );
  useEffect(() => {
    if (user) {
      load();
      if (location.pathname.replace(/\/$/, "") === "/login")
        navigate("/admin", { replace: true });
    } else if (session && location.pathname !== "/login")
      navigate("/login", { replace: true });
  }, [user?.id, session?.configured]);
  useEffect(() => {
    document.title = `${location.pathname.includes("/stock") ? "Stock" : location.pathname.includes("/products") ? "Products" : location.pathname.includes("/activity") ? "Activity" : user ? "Workspace" : "Staff sign in"} | Wolf Shop`;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname, user]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function saved() {
    await load({ quiet: true });
    await refresh();
    setNotice("Saved to the local workspace.");
    window.dispatchEvent(new Event("wolf-catalog-change"));
  }
  if (!session)
    return (
      <main className="workspace-loading" role="status">
        <img src={logo} alt="" width="40" height="40" />
        Opening workspace…
      </main>
    );
  if (!user)
    return (
      <Login
        session={session}
        onSignedIn={(u) =>
          setSession({ ...session, user: u, configured: true })
        }
        onRetry={check}
        offline={offline}
      />
    );
  let path = location.pathname.replace(/\/$/, "");
  let page;
  if (path === "/admin/products/new")
    page = <ProductEditor key="new" onSave={saved} allProducts={products} />;
  else if (path.startsWith("/admin/products/")) {
    const id = path.split("/").at(-1),
      product = products.find((p) => p.id === id);
    page = product ? (
      <ProductEditor
        key={`${id}-${product.version}`}
        product={product}
        onSave={saved}
        allProducts={products}
      />
    ) : (
      <div className="workspace-empty">
        <h1>Product not found.</h1>
        <Link to="/admin/products">Back to products</Link>
      </div>
    );
  } else if (path === "/admin/products")
    page = <Products products={products} />;
  else if (path === "/admin/stock")
    page = <Stock products={products} onSave={saved} />;
  else if (path === "/admin/activity")
    page = <Activity activity={activity} movements={movements} />;
  else page = <Overview products={products} activity={activity} />;
  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <Link to="/admin" className="workspace-wordmark">
          <img src={logo} alt="Wolf Shop" width="34" height="34" />
          <span>
            Wolf Shop<span>Workspace</span>
          </span>
        </Link>
        <ThemeToggle className="workspace-theme" />
        <p className="workspace-local">Local workspace</p>
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
          <div className="workspace-staff">
            <span className="workspace-avatar">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>
                {user.role === "admin" ? "Administrator" : "Editor"}
              </small>
            </div>
            <button
              aria-label="Sign out"
              onClick={async () => {
                try {
                  await api("/auth/logout", { method: "POST" });
                  setSession({ ...session, user: null });
                  navigate("/login", { replace: true });
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              <SignOut size={19} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <span>
            Wolf Shop <span>/</span>{" "}
            {path.includes("/stock")
              ? "Stock"
              : path.includes("/activity")
                ? "Activity"
                : path.includes("/products")
                  ? "Catalogue"
                  : "Overview"}
          </span>
          <span className="workspace-topbar-note">Changes here stay local</span>
        </header>
        <main className="workspace-content">
          <ErrorNote>{error}</ErrorNote>
          {notice && (
            <p className="workspace-saved" role="status">
              <Check size={16} />
              {notice}
            </p>
          )}
          {loading ? (
            <div className="workspace-loading" role="status">
              Loading catalogue…
            </div>
          ) : (
            page
          )}
        </main>
        <footer className="workspace-footer">
          Wolf Shop workspace <span>Catalogue & inventory</span>
        </footer>
      </div>
    </div>
  );
}
