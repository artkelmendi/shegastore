import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Eye,
  EyeSlash,
  SignOut,
} from "@phosphor-icons/react";
import { api, staticPreview } from "../api";
import "./customer.css";

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete = "current-password",
  disabled,
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="account-field">
      <label htmlFor={id}>{label}</label>
      <div className="account-password">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          minLength={15}
          maxLength={128}
          disabled={disabled}
          required
        />
        <button
          type="button"
          aria-label={`${show ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={show}
          onClick={() => setShow(!show)}
          disabled={disabled}
        >
          {show ? <EyeSlash size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
function Message({ children, error = false }) {
  return children ? (
    <p
      className={`account-message ${error ? "account-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {!error && <Check size={17} />}
      {children}
    </p>
  ) : null;
}
function AccessForm({ create, onSignedIn }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const change = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setError("");
  };
  async function submit(e) {
    e.preventDefault();
    setError("");
    if (create && form.password !== form.confirm) {
      setError("The passphrases do not match.");
      return;
    }
    setPending(true);
    try {
      const result = await api(`/customer/${create ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });
      onSignedIn(result.customer);
    } catch (error) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="account-access">
      <div className="account-photo">
        <img
          src={`${import.meta.env.BASE_URL}images/real/wolf-boss-editorial.webp`}
          alt="Black and white BOSS pieces arranged on pale stone platforms"
          width="1086"
          height="1448"
        />
        <span className="account-photo-label">
          <span />
          WOLF SHOP
        </span>
      </div>
      <div className="account-access-form">
        <span className="account-overline">YOUR ACCOUNT</span>
        <h1>{create ? "Make yourself at home." : "Good to see you."}</h1>
        <p>
          {create
            ? "A few details, and you’re in."
            : "Sign in with your email and passphrase."}
        </p>
        <div className="account-access-tabs" aria-label="Account access">
          <Link
            to="/account/sign-in"
            aria-current={!create ? "page" : undefined}
          >
            Sign in
          </Link>
          <Link to="/account/create" aria-current={create ? "page" : undefined}>
            Create account
          </Link>
        </div>
        <form onSubmit={submit}>
          {create && (
            <div className="account-field">
              <label htmlFor="customer-name">Your name</label>
              <input
                id="customer-name"
                autoComplete="name"
                minLength={2}
                maxLength={80}
                value={form.name}
                onChange={change("name")}
                disabled={pending}
                required
              />
            </div>
          )}
          <div className="account-field">
            <label htmlFor="customer-email">Email address</label>
            <input
              id="customer-email"
              type="email"
              autoComplete="username"
              maxLength={254}
              value={form.email}
              onChange={change("email")}
              disabled={pending}
              required
            />
          </div>
          <PasswordField
            id="customer-passphrase"
            label="Passphrase"
            value={form.password}
            onChange={change("password")}
            autoComplete={create ? "new-password" : "current-password"}
            disabled={pending}
          />
          {create && (
            <>
              <p className="account-hint">
                Use 15–128 characters. A short sentence works well.
              </p>
              <PasswordField
                id="customer-confirm"
                label="Confirm passphrase"
                value={form.confirm}
                onChange={change("confirm")}
                autoComplete="new-password"
                disabled={pending}
              />
              <p className="account-privacy-note">
                Your details are used to manage your account. Read our{" "}
                <Link to="/privacy">privacy information</Link>.
              </p>
            </>
          )}
          <Message error>{error}</Message>
          <button className="account-primary" disabled={pending}>
            {pending ? "Please wait…" : create ? "Create account" : "Sign in"}
            <ArrowRight size={18} />
          </button>
        </form>
        <p className="account-preview-note">
          This is a local account preview. Email confirmation and password
          recovery are not connected yet.
        </p>
        <Link to="/login" className="account-staff-link">
          Staff sign-in <ArrowUpRight size={14} />
        </Link>
      </div>
    </section>
  );
}
function Profile({ customer, onChanged, onSignedOut }) {
  const [name, setName] = useState(customer.name);
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const clear = () => {
    setError("");
    setNotice("");
  };
  const password = (key) => (e) => {
    setPasswords((prev) => ({ ...prev, [key]: e.target.value }));
    clear();
  };
  async function saveProfile(e) {
    e.preventDefault();
    clear();
    setPending(true);
    try {
      const result = await api("/customer/profile", {
        method: "PATCH",
        body: JSON.stringify({ name, version: customer.version }),
      });
      onChanged(result.customer);
      setName(result.customer.name);
      setNotice("Your details are saved.");
    } catch (error) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  }
  async function savePassword(e) {
    e.preventDefault();
    clear();
    if (passwords.next !== passwords.confirm) {
      setError("The new passphrases do not match.");
      return;
    }
    setPending(true);
    try {
      const result = await api("/customer/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.next,
        }),
      });
      onChanged(result.customer);
      setPasswords({ current: "", next: "", confirm: "" });
      setNotice("Passphrase updated. Other sessions have been signed out.");
    } catch (error) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  }
  async function signOut() {
    clear();
    setPending(true);
    try {
      await api("/customer/logout", { method: "POST" });
      onSignedOut();
    } catch (error) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className="account-heading">
        <div>
          <span className="account-overline">YOUR WOLF</span>
          <h1>Your account.</h1>
          <p>Welcome back, {customer.name}.</p>
        </div>
        <button
          className="account-text-button"
          onClick={signOut}
          disabled={pending}
        >
          Sign out <SignOut size={18} />
        </button>
      </div>
      <div className="account-profile">
        <aside className="account-directory">
          <span className="account-directory-current">Account details</span>
          <Link to="/saved">
            Saved pieces <ArrowUpRight size={16} />
          </Link>
          <Link to="/shop">
            Explore the collection <ArrowUpRight size={16} />
          </Link>
          <p>
            Your bag and saved pieces stay in this browser. Checkout and orders
            are not open yet.
          </p>
        </aside>
        <div className="account-settings">
          <Message error>{error}</Message>
          <Message>{notice}</Message>
          <section className="account-settings-section">
            <div>
              <span className="account-section-number">01</span>
              <h2>The details.</h2>
            </div>
            <form onSubmit={saveProfile}>
              <div className="account-field">
                <label htmlFor="profile-name">Your name</label>
                <input
                  id="profile-name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clear();
                  }}
                  minLength={2}
                  maxLength={80}
                  disabled={pending}
                  required
                />
              </div>
              <div className="account-field">
                <label htmlFor="profile-email">Email address</label>
                <input
                  id="profile-email"
                  type="email"
                  value={customer.email}
                  readOnly
                />
                <p className="account-hint">
                  Email changes will be available after verification is
                  connected.
                </p>
              </div>
              <button
                className="account-primary"
                disabled={pending || name.trim() === customer.name}
              >
                Save details <Check size={17} />
              </button>
            </form>
          </section>
          <section className="account-settings-section">
            <div>
              <span className="account-section-number">02</span>
              <h2>Keep it yours.</h2>
            </div>
            <form onSubmit={savePassword}>
              <PasswordField
                id="profile-current"
                label="Current passphrase"
                value={passwords.current}
                onChange={password("current")}
                disabled={pending}
              />
              <PasswordField
                id="profile-new"
                label="New passphrase"
                value={passwords.next}
                onChange={password("next")}
                autoComplete="new-password"
                disabled={pending}
              />
              <p className="account-hint">
                Use 15–128 characters. Changing it signs out your other
                sessions.
              </p>
              <PasswordField
                id="profile-confirm"
                label="Confirm new passphrase"
                value={passwords.confirm}
                onChange={password("confirm")}
                autoComplete="new-password"
                disabled={pending}
              />
              <button className="account-primary" disabled={pending}>
                Update passphrase <ArrowRight size={17} />
              </button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
export default function CustomerAccount() {
  const location = useLocation(),
    navigate = useNavigate();
  const [customer, setCustomer] = useState(undefined),
    [offline, setOffline] = useState("");
  const [retry, setRetry] = useState(0);
  // The outgoing page keeps its route while the shared page transition exits.
  const path = useRef(location.pathname.replace(/\/$/, "")).current;
  useEffect(() => {
    let cancelled = false;
    setOffline("");
    api("/customer/session")
      .then((data) => {
        if (!cancelled) setCustomer(data.customer);
      })
      .catch(() => {
        if (!cancelled)
          setOffline(
            staticPreview
              ? "Customer sign-in is not available on this static preview. A hosted account service is needed before online accounts open."
              : "Account access is unavailable. Start the local API, then try again.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [retry]);
  useEffect(() => {
    if (customer && path !== "/account")
      navigate("/account", { replace: true });
    else if (
      customer === null &&
      !["/account/sign-in", "/account/create"].includes(path)
    )
      navigate("/account/sign-in", { replace: true });
  }, [customer, path, navigate]);
  return (
    <div className="inner-page page-width account-page">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <span>Your account</span>
      </div>
      {offline ? (
        <section className="account-unavailable">
          <span className="account-overline">YOUR ACCOUNT</span>
          <h1>{staticPreview ? "Account preview." : "Back in a moment."}</h1>
          <Message error>{offline}</Message>
          {staticPreview ? (
            <Link className="account-primary" to="/shop">
              Explore the collection <ArrowRight size={18} />
            </Link>
          ) : (
            <button
              className="account-primary"
              onClick={() => setRetry((n) => n + 1)}
            >
              Try again <ArrowRight size={18} />
            </button>
          )}
        </section>
      ) : customer === undefined ||
        (customer && path !== "/account") ||
        (customer === null && path === "/account") ? (
        <div className="account-loading" role="status">
          Opening your account…
        </div>
      ) : customer ? (
        <Profile
          customer={customer}
          onChanged={setCustomer}
          onSignedOut={() => {
            navigate("/account/sign-in", { replace: true });
          }}
        />
      ) : (
        <AccessForm
          key={path}
          create={path === "/account/create"}
          onSignedIn={() => {
            navigate("/account", { replace: true });
          }}
        />
      )}
    </div>
  );
}
