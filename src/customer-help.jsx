import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Copy } from "@phosphor-icons/react";
import { socialLinks, instagramHandle } from "./site-config";

export function enquiryText(items) {
  const lines = items.map(
    ({ product, size, quantity = 1 }) =>
      `${product.brand} — ${product.name}\nColour: ${product.color} | Size: ${size || "please help me choose"} | Quantity: ${quantity}`,
  );
  return `Hi Wolf Shop, I’m interested in:\n\n${lines.join("\n\n")}\n\nCould you confirm availability, the final price, garment measurements, delivery cost and return conditions?`;
}
export function sizeIsListed(product, size) {
  const stock = product.stock?.[size];
  return (
    product.sizes.includes(size) && (!stock?.tracked || stock.available > 0)
  );
}
export function CopyEnquiry({ text, label = "Copy product details" }) {
  const [copiedText, setCopiedText] = useState("");
  const [manualText, setManualText] = useState("");
  const copied = copiedText === text;
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setManualText("");
    } catch {
      setCopiedText("");
      setManualText(text);
    }
  }
  return (
    <div className="copy-enquiry">
      <button type="button" className="enquiry-copy" onClick={copy}>
        {copied ? (
          <Check size={17} aria-hidden="true" />
        ) : (
          <Copy size={17} aria-hidden="true" />
        )}
        {copied ? "Copied — paste into Instagram" : label}
      </button>
      <span className="sr-only" role="status">
        {copied
          ? "Details copied. Open Instagram and paste them into your message. Nothing has been sent."
          : ""}
      </span>
      {manualText === text && (
        <label className="manual-enquiry">
          Copy this text into Instagram
          <textarea
            readOnly
            value={text}
            rows={7}
            onFocus={(e) => e.target.select()}
          />
        </label>
      )}
    </div>
  );
}
export function EnquiryPanel({ product, size }) {
  return (
    <section className="customer-enquiry" aria-label="Ask about this piece">
      <div className="enquiry-caption">
        <span>ASK BEFORE YOU ORDER</span>
        <span>{instagramHandle}</span>
      </div>
      <h2>Check the details with us.</h2>
      <p>
        Send us the details below. We’ll confirm availability, the final price
        and delivery before you decide.
      </p>
      <div className="enquiry-selection" aria-live="polite">
        <span>{product.color}</span>
        <span>{size ? `Size ${size}` : "Not sure about size? Ask us."}</span>
      </div>
      <a
        className="button enquiry-primary"
        href={socialLinks.instagram}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>Ask on Instagram</span>
        <ArrowUpRight size={19} />
      </a>
      <CopyEnquiry text={enquiryText([{ product, size }])} />
      <p className="enquiry-footnote">
        Copy the details, then paste them into a message to {instagramHandle}.
        No order is placed here.
      </p>
    </section>
  );
}
export function ShoppingNote() {
  return (
    <aside className="shopping-note" aria-label="How to order">
      <div>
        <strong>Found something you like?</strong>
        <span>
          Choose a colour and size. We’ll check the rest on Instagram.
        </span>
      </div>
      <Link to="/contact">
        How to order <ArrowUpRight size={17} />
      </Link>
    </aside>
  );
}
export function FitHelp({ category = "T-Shirts" }) {
  const tracksuit = category === "Tracksuits";
  return (
    <div className="fit-help">
      <p className="fit-intro">Compare with something you already wear.</p>
      <p>
        Sizes vary between pieces. We don’t have verified garment measurements
        for this collection yet, so we won’t guess your fit.
      </p>
      <ol>
        <li>
          <strong>Lay a similar piece flat.</strong>
          <span>
            Use a T-shirt, sweatshirt or jacket that fits the way you like.
            Smooth it out without stretching it.
          </span>
        </li>
        <li>
          <strong>Measure the width and length.</strong>
          <span>
            Measure straight across from underarm to underarm for chest width.
            Measure from the top of the shoulder to the hem for length. These
            are flat garment measurements, not body measurements.
          </span>
        </li>
        {tracksuit && (
          <li>
            <strong>Check the trousers too.</strong>
            <span>
              Measure the waistband laid flat and the inside leg from crotch
              seam to hem on a pair that fits. Ask us to confirm both the jacket
              and trouser measurements.
            </span>
          </li>
        )}
        <li>
          <strong>Send your measurements to us.</strong>
          <span>
            Include your preferred fit — closer, regular or relaxed — and ask us
            to check the actual piece before ordering.
          </span>
        </li>
      </ol>
      <div className="fit-unit-note">
        Use centimetres or inches and tell us which. If you convert: 1 inch =
        2.54 cm.
      </div>
      <a
        className="text-link"
        href={socialLinks.instagram}
        target="_blank"
        rel="noopener noreferrer"
      >
        Ask for garment measurements <ArrowUpRight size={17} />
      </a>
    </div>
  );
}
