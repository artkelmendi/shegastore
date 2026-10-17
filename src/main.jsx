import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  CheckCircle,
  Heart,
  MagnifyingGlass,
  Minus,
  Plus,
  ShoppingBag,
  SlidersHorizontal,
  X,
  List,
  EnvelopeSimple,
  Truck,
  ArrowCounterClockwise,
  Ruler,
  Trash,
  Pause,
  Play,
  UserCircle,
} from "@phosphor-icons/react";
import { brands, brandLogos, categories, money } from "./data";
import { CatalogProvider, useCatalog } from "./catalog";
import { staticPreview } from "./api";
import { ThemeProvider, ThemeToggle, useTheme } from "./theme";
import { BackgroundMarks, DrawnHeroLogo } from "./brand-motion";
import {
  OutfitEdit,
  CookieConsent,
  CookieSettingsButton,
  SmoothExperience,
  RedPointer,
  DetailReveals,
} from "./finishing";
import "./styles.css";
import "./editorial.css";
import "./brand-motion.css";
import "./type-system.css";
import { originEnabled, OriginEntrance } from "./origin-entrance";

import { ScrollDetails } from "./scroll-details";
import "./wolf-theme.css";

const Store = createContext();
const ease = [0.23, 1, 0.32, 1];
const editorialImages = {
  hero: "boss-striped-1",
  editorial: "editorial-boss",
  flatlay: "diesel-sweat-16",
  tee: "diesel-special-117",
  sweatshirt: "diesel-sweat-14",
  hoodie: "armani-sweat-5",
};
const asset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
const image = (name) =>
  name?.startsWith("/api/media/")
    ? name
    : asset(`/images/real/${editorialImages[name] || name}.webp`);

function readSaved(key, fallback, validate) {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) ??
        localStorage.getItem(key.replace(/^wolf-/, "shega-")),
    );
    return validate(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function StoreProvider({ children }) {
  const { products, source } = useCatalog();
  const [bag, setBag] = useState(() =>
    readSaved(
      "wolf-bag",
      [],
      (v) =>
        Array.isArray(v) &&
        v.every(
          (i) =>
            typeof i.id === "string" &&
            typeof i.size === "string" &&
            Number.isInteger(i.quantity) &&
            i.quantity > 0 &&
            i.quantity <= 10,
        ),
    ),
  );
  const [saved, setSaved] = useState(() =>
    readSaved(
      "wolf-saved",
      [],
      (v) => Array.isArray(v) && v.every((id) => typeof id === "string"),
    ),
  );
  const [overlay, setOverlay] = useState(null);
  const [notice, setNotice] = useState("");
  const { theme, setTheme } = useTheme();
  const noticeTimeout = useRef();
  useEffect(() => {
    if (source !== "database") return;
    setBag((previous) =>
      previous.flatMap((item) => {
        const product = products.find((p) => p.id === item.id);
        if (!product?.sizes.includes(item.size)) return [];
        const stock = product.stock?.[item.size];
        const quantity = stock?.tracked
          ? Math.min(item.quantity, stock.available)
          : item.quantity;
        return quantity > 0 ? [{ ...item, quantity }] : [];
      }),
    );
    setSaved((previous) =>
      previous.filter((id) => products.some((p) => p.id === id)),
    );
  }, [products, source]);
  useEffect(() => {
    try {
      localStorage.setItem("wolf-bag", JSON.stringify(bag));
    } catch {}
  }, [bag]);
  useEffect(() => {
    try {
      localStorage.setItem("wolf-saved", JSON.stringify(saved));
    } catch {}
  }, [saved]);
  useEffect(() => () => clearTimeout(noticeTimeout.current), []);
  const notify = (text) => {
    clearTimeout(noticeTimeout.current);
    setNotice(text);
    noticeTimeout.current = setTimeout(() => setNotice(""), 4500);
  };
  const toggleSaved = (id) =>
    setSaved((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  const addToBag = (id, size) => {
    const stock = products.find((p) => p.id === id)?.stock?.[size];
    const limit = stock?.tracked ? Math.min(10, stock.available) : 10;
    if (limit < 1) {
      notify("That size is currently out of stock.");
      return;
    }
    setBag((previous) => {
      const existing = previous.find(
        (item) => item.id === id && item.size === size,
      );
      return existing
        ? previous.map((item) =>
            item === existing
              ? { ...item, quantity: Math.min(item.quantity + 1, limit) }
              : item,
          )
        : [...previous, { id, size, quantity: 1 }];
    });
    setOverlay("bag");
  };
  return (
    <Store.Provider
      value={{
        bag,
        setBag,
        saved,
        toggleSaved,
        overlay,
        setOverlay,
        notice,
        notify,
        dismissNotice: () => setNotice(""),
        addToBag,
        theme,
        setTheme,
      }}
    >
      {children}
    </Store.Provider>
  );
}

function Reveal({ children, className = "", delay = 0 }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, transform: reduced ? "none" : "translateY(30px)" }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{
        duration: reduced ? 0.15 : 0.75,
        ease,
        delay: reduced ? 0 : delay,
      }}
    >
      {children}
    </motion.div>
  );
}

function Button({ to, children, className = "", ...props }) {
  const content = (
    <>
      <span>{children}</span>
      <ArrowRight size={19} />
    </>
  );
  return to ? (
    <Link to={to} className={`button ${className}`} {...props}>
      {content}
    </Link>
  ) : (
    <button className={`button ${className}`} {...props}>
      {content}
    </button>
  );
}

function Opening({ phase, onComplete }) {
  const dialog = useRef();
  useLayoutEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    element.focus({ preventScroll: true });
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`opening ${phase === "departing" ? "opening-is-leaving" : ""}`}
      aria-label="Welcome to Wolf Shop"
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault();
        onComplete();
      }}
      onTransitionEnd={(event) => {
        if (
          event.target === event.currentTarget &&
          event.propertyName === "opacity" &&
          phase === "departing"
        )
          onComplete();
      }}
    >
      <div className="opening-brand">
        <div className="opening-logo-mask">
          <img
            className="opening-logo"
            src={asset("/logos/wolf-full-light.svg")}
            alt="Wolf Shop"
            width="300"
            height="105"
            fetchPriority="high"
          />
        </div>
        <p className="opening-caption">Wear your own statement.</p>
      </div>
      <button className="opening-skip" onClick={onComplete}>
        Enter store <ArrowRight size={16} />
      </button>
    </dialog>
  );
}

function Header() {
  const { bag, setOverlay, saved } = useContext(Store);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const marker = useRef();
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setAtTop(entry.isIntersecting),
    );
    observer.observe(marker.current);
    return () => observer.disconnect();
  }, []);
  const count = bag.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <>
      <div ref={marker} className="header-marker" aria-hidden="true" />
      <header
        className={`site-header ${isHome && atTop ? "header-over-hero" : ""}`}
      >
        <div className="header-inner">
          <Link to="/" aria-label="Wolf Shop home" className="header-brand">
            <img
              className="header-logo header-mark"
              src={asset("/logos/wolf-ticket-light.svg")}
              alt="Wolf Shop"
              width="134"
              height="47"
            />
          </Link>
          <NavLink to="/shop" className="mobile-shop-link">
            Shop
          </NavLink>
          <nav className="desktop-nav" aria-label="Main navigation">
            <NavLink to="/shop">Shop</NavLink>
            <Link className="sale-link" to="/shop?edit=sale">
              Sale
            </Link>
            <NavLink to="/contact">Contact us</NavLink>
            <NavLink to="/faq">Common questions</NavLink>
          </nav>
          <div className="header-tools">
            <ThemeToggle />
            <button
              aria-label="Search the store"
              className="icon-button"
              onClick={() => setOverlay("search")}
            >
              <MagnifyingGlass />
            </button>
            <Link
              aria-label="Your account"
              className="icon-button account-nav"
              to="/account"
            >
              <UserCircle />
            </Link>
            <Link
              aria-label={`Saved items${saved.length ? ` (${saved.length})` : ""}`}
              className="icon-button saved-nav"
              to="/saved"
            >
              <Heart />
            </Link>
            <button
              aria-label={`Open shopping bag (${count} items)`}
              className="icon-button bag-button"
              onClick={() => setOverlay("bag")}
            >
              <ShoppingBag />
              <span className="bag-count" aria-hidden="true">
                {count}
              </span>
            </button>
            <button
              aria-label="Open navigation menu"
              className="icon-button mobile-toggle"
              onClick={() => setOverlay("menu")}
            >
              <List />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

const heroSlides = [
  {
    title: ["Dress Like", "yourself."],
    copy: "Distinctive pieces. Iconic names. A wardrobe with a point of view.",
    image: "wolf-boss-hero",
    alt: "Stacked black and white BOSS polo shirts with contrasting collars and a patterned Porsche BOSS layer",
    label: "The BOSS edit",
    link: "/shop",
  },
  {
    title: ["Make It", "personal."],
    copy: "Considered details. Individual style. A new perspective on your everyday wardrobe.",
    image: "wolf-armani-hero",
    alt: "Stacked black and white Emporio Armani polo shirts with striped collars and eagle embroidery",
    label: "The Armani edit",
    link: "/shop",
  },
];

function BrandMarquee() {
  const [paused, setPaused] = useState(false);
  return (
    <section
      className="brand-marquee page-width"
      aria-label="Explore the brands"
    >
      <div className="brand-band-heading">
        <h2>In good company.</h2>
        <p>ICONIC LABELS. YOUR OWN WAY.</p>
      </div>
      <div className="brand-marquee-window">
        <div className={`brand-marquee-track ${paused ? "is-paused" : ""}`}>
          {[0, 1].map((copy) => (
            <div
              className="brand-marquee-group"
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
            >
              {brands.map((brand) => (
                <React.Fragment key={brand}>
                  <Link
                    to={`/shop?brand=${encodeURIComponent(brand)}`}
                    className={`official-brand brand-${brand.split(" ")[0].toLowerCase()}`}
                    tabIndex={copy ? -1 : undefined}
                    aria-label={`Shop ${brand}`}
                  >
                    <img
                      src={brandLogos[brand]}
                      alt={brand}
                      width="160"
                      height="50"
                    />
                  </Link>
                  <span className="brand-band-divider" aria-hidden="true">
                    <img
                      src={asset("/logos/wolf-ticket-light.svg")}
                      alt=""
                      width="22"
                      height="22"
                    />
                  </span>
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>
      <button
        className="marquee-control icon-button"
        onClick={() => setPaused(!paused)}
        aria-label={paused ? "Play brand animation" : "Pause brand animation"}
        aria-pressed={paused}
      >
        {paused ? <Play size={13} /> : <Pause size={13} />}
      </button>
    </section>
  );
}

function Home({ ready = true }) {
  const [slide, setSlide] = useState(0);
  const [loadedImages, setLoadedImages] = useState({});
  const [direction, setDirection] = useState(1);
  const hero = useRef();
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: hero,
    offset: ["start start", "end start"],
  });
  const transform = useTransform(
    scrollYProgress,
    [0, 1],
    ["translateY(0px) scale(1.025)", "translateY(100px) scale(1.025)"],
  );
  const current = heroSlides[slide];
  const change = (delta) => {
    setDirection(delta);
    setSlide(
      (previous) => (previous + delta + heroSlides.length) % heroSlides.length,
    );
  };
  return (
    <>
      <section
        className={`hero hero-${current.image} ${ready ? "hero-is-ready" : "hero-is-waiting"}`}
        ref={hero}
        aria-label="Wolf Shop seasonal collection"
      >
        <motion.div
          className="hero-photography"
          style={{ transform: reduced ? "none" : transform }}
        >
          {heroSlides.map((item, index) => (
            <img
              key={item.image}
              className={`hero-image hero-image-${item.image} ${index === slide ? "is-active" : ""} ${loadedImages[item.image] ? "is-loaded" : ""}`}
              src={image(item.image)}
              alt={item.alt}
              aria-hidden={index !== slide}
              width="1672"
              height="941"
              fetchPriority={index === 0 ? "high" : "low"}
              decoding="async"
              onLoad={async (event) => {
                const element = event.currentTarget;
                try {
                  await element.decode();
                } catch {}
                setLoadedImages((previous) => ({
                  ...previous,
                  [item.image]: true,
                }));
              }}
            />
          ))}
        </motion.div>
        <div className="hero-shade" />

        <div className="hero-content page-width">
          <DrawnHeroLogo />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide}
              className="hero-message"
              initial={{
                opacity: 0,
                transform: reduced ? "none" : `translateY(${direction * 14}px)`,
              }}
              animate={{ opacity: 1, transform: "translateY(0px)" }}
              exit={{
                opacity: 0,
                transform: reduced
                  ? "none"
                  : `translateY(${-direction * 14}px)`,
              }}
              transition={{ duration: 0.28, ease }}
            >
              <h1 className="hero-title" aria-label={current.title.join(" ")}>
                <span className="hero-title-mask">
                  <span className="hero-enter" style={{ "--delay": "70ms" }}>
                    {current.title[0]}
                  </span>
                </span>
                <span className="hero-title-mask">
                  <span
                    className="hero-enter accent"
                    style={{ "--delay": "150ms" }}
                  >
                    {current.title[1]}
                  </span>
                </span>
              </h1>
              <p
                className="hero-description hero-enter"
                style={{ "--delay": "230ms" }}
              >
                {current.copy}
              </p>
              <div className="hero-enter" style={{ "--delay": "310ms" }}>
                <Button to={current.link}>Explore the collection</Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="hero-pagination">
          <span className="hero-slide-name">{current.label}</span>
          <div className="hero-dots" aria-label="Hero slides">
            {heroSlides.map((s, index) => (
              <button
                key={s.label}
                className={slide === index ? "active" : ""}
                aria-label={`Show ${s.label}`}
                aria-pressed={slide === index}
                onClick={() => {
                  setDirection(index > slide ? 1 : -1);
                  setSlide(index);
                }}
              />
            ))}
          </div>
          <div className="hero-arrows">
            <button
              className="circle-button"
              aria-label="Previous collection"
              onClick={() => change(-1)}
            >
              <CaretLeft />
            </button>
            <button
              className="circle-button"
              aria-label="Next collection"
              onClick={() => change(1)}
            >
              <CaretRight />
            </button>
          </div>
        </div>
      </section>
      <BrandMarquee />
      <section
        className="category-section page-width"
        aria-label="Shop by category"
      >
        <div className="category-grid">
          {[
            {
              name: "T-SHIRTS",
              image: "tee",
              link: "/shop?category=T-Shirts",
              sub: "The everyday essentials",
              className: "category-tees",
            },
            {
              name: "SWEATSHIRTS",
              image: "sweatshirt",
              link: "/shop?category=Sweatshirts",
              sub: "Layers with presence",
              className: "category-sweats",
            },
            {
              name: "HOODIES",
              image: "hoodie",
              link: "/shop?category=Hoodies",
              sub: "Your everyday layer",
              className: "category-hoodies",
            },
          ].map((category, i) => (
            <Reveal key={category.name} delay={i * 0.06}>
              <Link
                to={category.link}
                className={`category-tile ${category.className}`}
              >
                <img
                  src={image(category.image)}
                  alt={
                    category.name === "THE NEW EDIT"
                      ? "The latest menswear selection"
                      : `${category.name.toLowerCase()} collection`
                  }
                  width="600"
                  height="720"
                  loading="lazy"
                />
                <div className="category-shade" />
                <div className="category-caption">
                  <span>{category.sub}</span>
                  <div>
                    <h2>{category.name}</h2>
                    <ArrowUpRight size={25} />
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
      <FavoritesCarousel />
      <section className="editorial-section page-width">
        <Reveal className="editorial-photo">
          <img
            src={image("wolf-boss-editorial")}
            alt="Black and white BOSS polo shirts and sweatshirt displayed on white plinths"
            width="1086"
            height="1448"
            loading="lazy"
          />
        </Reveal>
        <div className="editorial-copy">
          <Reveal>
            <p className="eyebrow">THE OFF-DUTY EDIT</p>
            <h2>
              GOOD STYLE.
              <br />
              NO EFFORT.
            </h2>
            <p>
              The pieces you reach for, again and again. Easy layers, clean
              silhouettes, and details that make the difference.
            </p>
            <Button to="/shop?category=Hoodies" className="button-outline">
              Find your everyday
            </Button>
          </Reveal>
          <Reveal className="editorial-footnote">
            <span>CONSIDERED PIECES.</span>
            <span>INDIVIDUAL STYLE.</span>
            <img
              src={asset("/logos/wolf-ticket-light.svg")}
              alt=""
              width="36"
              height="36"
            />
          </Reveal>
        </div>
      </section>
      <OutfitEdit />
    </>
  );
}

function FavoritesCarousel() {
  const { products } = useCatalog();
  const selection = React.useMemo(() => {
    const shuffled = [...products];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [products]);
  return (
    <section
      className="favorites-section section page-width"
      aria-label="Our favorites"
    >
      <Reveal className="section-heading">
        <div>
          <p className="eyebrow">THE WOLF SELECTION</p>
          <h2>
            Our favorites<span className="accent">.</span>
          </h2>
        </div>
        <Link to="/shop" className="text-link">
          Shop all pieces <ArrowUpRight size={18} />
        </Link>
      </Reveal>
      <div className="favorites-window">
        <div className="favorites-track">
          {[0, 1].map((copy) => (
            <div
              className="favorites-group"
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
            >
              {selection.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  duplicate={copy === 1}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="catalog-note">
        A changing point of view. Sample styles and prices.
      </p>
    </section>
  );
}

function FAQ() {
  const questions = [
    [
      "What does Wolf Shop sell?",
      "Wolf Shop's selection is presented as 1:1 replica clothing. These are not authentic products from, or an official partnership with, the featured brands. Product photographs illustrate the styles; confirm the actual item before ordering.",
    ],
    [
      "How do I choose my size?",
      "Open a product and use its size guide. Compare the measurements with a garment you already own. Available sizes are shown on each product; confirm fit and stock before placing an order.",
    ],
    [
      "Can I order through this website?",
      "This is a frontend preview. You can explore styles, save favorites and build a bag, but no payment or order is processed here.",
    ],
    [
      "What about delivery and returns?",
      "Delivery areas, costs, timeframes and return terms must be confirmed with Wolf Shop before an order. The preview does not calculate shipping or promise a delivery date.",
    ],
    [
      "Are prices and stock final?",
      "The selection and prices are illustrative. Confirm the price, available colors and stock with Wolf Shop before purchasing.",
    ],
    [
      "Where are my saved pieces kept?",
      "Your bag and saved pieces are stored in this browser on this device. Clearing browser storage removes them.",
    ],
  ];
  return (
    <section className="faq-page section page-width" data-reveal="">
      <p className="eyebrow">A LITTLE CLARITY</p>
      <h1>
        Common questions<span className="accent">.</span>
      </h1>
      <p className="faq-intro">
        The details, before you find your next favorite.
      </p>
      <div className="faq-list">
        {questions.map(([question, answer], i) => (
          <details key={question}>
            <summary>
              <span className="faq-number">0{i + 1}</span>
              {question}
              <Plus size={20} />
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
      <Button to="/contact" className="button-outline">
        Contact us
      </Button>
    </section>
  );
}

function ProductCard({ product, duplicate = false }) {
  const { saved, toggleSaved } = useContext(Store);
  const isSaved = saved.includes(product.id);
  return (
    <article
      className="product-card"
      data-image-crop={product.id === "boss-ivory-hoodie" ? "full" : undefined}
    >
      <div className="product-image-wrap">
        <Link
          tabIndex={duplicate ? -1 : undefined}
          to={`/product/${product.id}`}
          className="product-image-link"
          aria-label={`View ${product.brand} ${product.name}`}
        >
          <img
            src={image(product.image)}
            alt={`${product.brand} ${product.name} in ${product.color.toLowerCase()}`}
            width="600"
            height="750"
            loading="lazy"
          />
          {product.alternate && (
            <img
              className="product-alternate"
              src={image(product.alternate)}
              alt=""
              width="600"
              height="750"
              loading="lazy"
            />
          )}
          <span className="product-view">
            Discover piece <ArrowUpRight size={18} />
          </span>
        </Link>
        <button
          tabIndex={duplicate ? -1 : undefined}
          className={`product-save icon-button ${isSaved ? "is-saved" : ""}`}
          aria-label={`${isSaved ? "Remove" : "Save"} ${product.name}${isSaved ? " from saved items" : ""}`}
          aria-pressed={isSaved}
          onClick={() => toggleSaved(product.id)}
        >
          <Heart weight={isSaved ? "fill" : "regular"} size={20} />
        </button>
      </div>
      <div className="product-meta">
        <span className="product-brand">{product.brand}</span>
        <span>
          {product.oldPrice ? (
            <>
              <span className="old-price">{money(product.oldPrice)}</span>{" "}
              <span className="sale-price">{money(product.price)}</span>
            </>
          ) : (
            money(product.price)
          )}
        </span>
      </div>
      <Link
        tabIndex={duplicate ? -1 : undefined}
        to={`/product/${product.id}`}
        className="product-name"
      >
        {product.name}
      </Link>
      <div className="product-color">
        <span style={{ backgroundColor: product.hex }} />
        {product.color}
        <span className="product-type">1:1 replica</span>
      </div>
    </article>
  );
}

function Shop() {
  const { products } = useCatalog();
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "All pieces";
  const brand = params.get("brand") || "All brands";
  const edit = params.get("edit");
  const query = params.get("q") || "";
  const [sort, setSort] = useState("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value.startsWith("All") || !value) next.delete(key);
    else next.set(key, value);
    setParams(next);
  };
  let filtered = products.filter(
    (p) =>
      (category === "All pieces" || p.category === category) &&
      (brand === "All brands" || p.brand === brand) &&
      (edit !== "new" || p.fresh) &&
      (edit !== "sale" || p.oldPrice) &&
      (!query ||
        `${p.brand} ${p.name} ${p.category} ${p.color}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  if (sort === "price-asc")
    filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sort === "price-desc")
    filtered = [...filtered].sort((a, b) => b.price - a.price);
  if (sort === "new")
    filtered = [...filtered].sort((a, b) => Number(b.fresh) - Number(a.fresh));
  const title = query
    ? `Search: “${query}”`
    : edit === "new"
      ? "Just landed"
      : edit === "sale"
        ? "Sale"
        : category !== "All pieces"
          ? category
          : brand !== "All brands"
            ? brand
            : "The collection";
  return (
    <div className="inner-page shop-page page-width">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <span>Shop</span>
      </div>
      <Reveal className="page-intro">
        <p className="eyebrow">WOLF SHOP / SHOP</p>
        <h1>{title}</h1>
        <p>T-shirts, hoodies and sweatshirts. Find your fit.</p>
      </Reveal>
      <div className="shop-tabs" aria-label="Product categories">
        {categories.map((c) => (
          <button
            key={c}
            className={category === c ? "active" : ""}
            aria-pressed={category === c}
            onClick={() => update("category", c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="shop-toolbar">
        <button
          className="filter-toggle"
          onClick={() => setFiltersOpen(!filtersOpen)}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal size={19} /> Filters{" "}
          {brand !== "All brands" && <span>(1)</span>}
        </button>
        <span className="results-count" aria-live="polite">
          {filtered.length} pieces
        </span>
        <label className="sort-select">
          <span>Sort by</span>
          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="featured">Featured</option>
            <option value="new">Newest first</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
          <CaretDown size={12} />
        </label>
      </div>
      {filtersOpen && (
        <div className="filter-panel">
          <label>
            Brand
            <select
              aria-label="Brand"
              value={brand}
              onChange={(e) => update("brand", e.target.value)}
            >
              <option>All brands</option>
              {brands.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label>
            Edit
            <select
              aria-label="Edit"
              value={edit || ""}
              onChange={(e) => update("edit", e.target.value)}
            >
              <option value="">All pieces</option>
              <option value="new">New arrivals</option>
              <option value="sale">On sale</option>
            </select>
          </label>
          <button
            className="text-link"
            onClick={() => {
              setParams({});
              setSort("featured");
            }}
          >
            Clear filters <X size={14} />
          </button>
        </div>
      )}
      {(query || brand !== "All brands" || edit) && (
        <div className="active-filters">
          {query && (
            <button onClick={() => update("q", "")}>
              Search: {query} <X size={13} />
            </button>
          )}
          {brand !== "All brands" && (
            <button onClick={() => update("brand", "")}>
              {brand} <X size={13} />
            </button>
          )}
          {edit && (
            <button onClick={() => update("edit", "")}>
              {edit === "new" ? "New arrivals" : "On sale"} <X size={13} />
            </button>
          )}
        </div>
      )}
      {filtered.length ? (
        <div
          className="product-grid shop-products"
          key={params.toString() + sort}
        >
          {filtered.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i, 3) * 0.05}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      ) : (
        <EmptyState
          title="NOTHING HERE. YET."
          text="Try another brand, category, or search term."
          action={
            <Button onClick={() => setParams({})}>View all pieces</Button>
          }
        />
      )}
      <p className="shop-disclosure">
        Wolf Shop offers 1:1 replica styles. Products are not manufactured or
        authorised by the referenced brands. Images and prices are illustrative.
      </p>
    </div>
  );
}

function Product({ id }) {
  const { products, loading } = useCatalog();
  const p = products.find((item) => item.id === id);
  const { saved, toggleSaved, addToBag, setOverlay } = useContext(Store);
  const [size, setSize] = useState("");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(false);
  const [photo, setPhoto] = useState(0);
  const sizeGroup = useRef();
  useEffect(() => {
    setSize("");
    setError("");
    setZoom(false);
    setPhoto(0);
  }, [id]);
  if (!p)
    return loading ? (
      <div className="inner-page page-width" role="status">
        Loading piece…
      </div>
    ) : (
      <NotFound />
    );
  return (
    <div className="inner-page page-width product-page">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/shop">Shop</Link>
        <span>/</span>
        <Link to={`/shop?category=${p.category}`}>{p.category}</Link>
      </div>
      <div className="product-detail">
        <Reveal className="product-gallery">
          <button
            className={`product-zoom ${zoom ? "zoomed" : ""}`}
            onClick={() => setZoom(!zoom)}
            aria-label={
              zoom ? "Zoom out of product photo" : "Zoom into product photo"
            }
            aria-pressed={zoom}
          >
            <img
              src={image(p.gallery?.[photo] || p.image)}
              alt={`${p.brand} ${p.name} in ${p.color.toLowerCase()}, photo ${photo + 1}`}
              width="800"
              height="1000"
            />
            <span>
              <MagnifyingGlass size={18} />
              {zoom ? "Zoom out" : "A closer look"}
            </span>
          </button>
          <div className="product-thumbnails" aria-label="Product photographs">
            {(p.gallery || [p.image]).map((file, index) => (
              <button
                key={file}
                className={photo === index ? "selected" : ""}
                aria-label={`View product photo ${index + 1}`}
                aria-pressed={photo === index}
                onClick={() => {
                  setPhoto(index);
                  setZoom(false);
                }}
              >
                <img src={image(file)} alt="" width="80" height="105" />
              </button>
            ))}
          </div>
        </Reveal>
        <Reveal className="product-info" delay={0.1}>
          <Link
            to={`/shop?brand=${encodeURIComponent(p.brand)}`}
            className="product-detail-brand"
          >
            {p.brand}
          </Link>
          <h1>{p.name}</h1>
          <div className="detail-price">
            {p.oldPrice && (
              <span className="old-price">{money(p.oldPrice)}</span>
            )}
            {money(p.price)}
            <span>1:1 replica</span>
          </div>
          <p className="product-description">{p.description}</p>
          <div className="detail-color">
            Colour: <strong>{p.color}</strong>
            <span
              className="color-swatch"
              style={{ background: p.hex }}
              aria-label={p.color}
            />
          </div>
          <div className="size-heading">
            <span>Select your size</span>
            <button className="text-link" onClick={() => setOverlay("size")}>
              Size guide <Ruler size={15} />
            </button>
          </div>
          <div
            ref={sizeGroup}
            className={`size-options ${error ? "has-error" : ""}`}
            role="group"
            aria-label="Select your size"
            aria-describedby={error ? "size-error" : undefined}
          >
            {p.sizes.map((s) => (
              <button
                key={s}
                className={size === s ? "selected" : ""}
                aria-pressed={size === s}
                disabled={!!p.stock?.[s]?.tracked && p.stock[s].available < 1}
                title={
                  p.stock?.[s]?.tracked && p.stock[s].available < 1
                    ? "Out of stock"
                    : undefined
                }
                onClick={() => {
                  setSize(s);
                  setError("");
                }}
              >
                {s}
              </button>
            ))}
          </div>
          {error && (
            <p id="size-error" className="field-error" role="alert">
              {error}
            </p>
          )}
          {p.stock && (
            <p className="product-availability" aria-live="polite">
              {p.sizes.every(
                (s) => p.stock[s]?.tracked && p.stock[s].available < 1,
              )
                ? "This piece is currently out of stock."
                : size
                  ? p.stock[size]?.tracked
                    ? p.stock[size].available > 0
                      ? `${p.stock[size].available} available in size ${size}`
                      : "This size is currently out of stock."
                    : "Availability for this size has not been confirmed."
                  : "Choose a size to check availability."}
            </p>
          )}
          <div className="add-to-bag">
            <Button
              disabled={
                p.sizes.every(
                  (s) => p.stock?.[s]?.tracked && p.stock[s].available < 1,
                ) ||
                (!!size &&
                  !!p.stock?.[size]?.tracked &&
                  p.stock[size].available < 1)
              }
              onClick={() => {
                if (!size) {
                  setError("Please choose your size.");
                  sizeGroup.current
                    ?.querySelector("button:not(:disabled)")
                    ?.focus();
                } else addToBag(p.id, size);
              }}
            >
              {p.sizes.every(
                (s) => p.stock?.[s]?.tracked && p.stock[s].available < 1,
              )
                ? "Out of stock"
                : "Add to bag"}
            </Button>
            <button
              aria-label={`${saved.includes(id) ? "Remove from" : "Add to"} saved items`}
              aria-pressed={saved.includes(id)}
              className={`save-detail icon-button ${saved.includes(id) ? "is-saved" : ""}`}
              onClick={() => toggleSaved(id)}
            >
              <Heart weight={saved.includes(id) ? "fill" : "regular"} />
            </button>
          </div>
          <div className="detail-services">
            <span>
              <Truck size={19} /> Delivery details at launch
            </span>
            <span>
              <ArrowCounterClockwise size={19} /> Size and care guidance
            </span>
          </div>
          <details open>
            <summary>
              About this piece <Plus size={16} />
            </summary>
            <p>
              {p.description} This is an illustrative 1:1 replica style, not an
              original brand product. Final materials, fit, and measurements
              will be confirmed with the actual stock.
            </p>
          </details>
          <details>
            <summary>
              Delivery & returns <Plus size={16} />
            </summary>
            <p>
              This storefront is a frontend preview. Shipping, payment, and
              return terms will be added before orders open. No payment is taken
              here.
            </p>
          </details>
          <details>
            <summary>
              Care guide <Plus size={16} />
            </summary>
            <p>
              Always follow the care label on your garment. Wash similar colours
              together and avoid ironing directly over prints.
            </p>
          </details>
        </Reveal>
      </div>
      <section className="section">
        <Reveal className="section-heading">
          <h2>
            COMPLETE YOUR ROTATION<span className="accent">.</span>
          </h2>
          <Link to="/shop" className="text-link">
            Explore all <ArrowUpRight size={18} />
          </Link>
        </Reveal>
        <div className="product-grid">
          {products
            .filter((item) => item.id !== id)
            .slice(0, 4)
            .map((item, i) => (
              <Reveal key={item.id} delay={i * 0.05}>
                <ProductCard product={item} />
              </Reveal>
            ))}
        </div>
      </section>
    </div>
  );
}

function Brands() {
  const { products } = useCatalog();
  return (
    <div className="inner-page page-width">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <span>Brands</span>
      </div>
      <Reveal className="page-intro">
        <p className="eyebrow">THE NAMES. THE ATTITUDE.</p>
        <h1>The labels</h1>
        <p>Explore the styles that speak your language.</p>
      </Reveal>
      <div className="brands-layout">
        <Reveal className="brands-photo">
          <img
            src={image("flatlay")}
            width="900"
            height="1100"
            alt="Official Diesel photography of a model wearing a distressed Oval D sweatshirt"
          />
        </Reveal>
        <div className="brand-directory">
          {brands.map((brand, i) => (
            <Reveal key={brand} delay={i * 0.05}>
              <Link to={`/shop?brand=${encodeURIComponent(brand)}`}>
                <span
                  className={`official-brand brand-${brand.split(" ")[0].toLowerCase()}`}
                >
                  <img
                    src={brandLogos[brand]}
                    alt={brand}
                    width="190"
                    height="50"
                  />
                </span>
                <span className="brand-piece-count">
                  {products.filter((p) => p.brand === brand).length}{" "}
                  {products.filter((p) => p.brand === brand).length === 1
                    ? "piece"
                    : "pieces"}
                </span>
                <ArrowUpRight size={25} />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
      <p className="shop-disclosure">
        An independent selection of replica styles. Wolf Shop is not affiliated
        with, endorsed by, or an authorised retailer of the brands referenced.
      </p>
    </div>
  );
}

function Saved() {
  const { products } = useCatalog();
  const { saved } = useContext(Store);
  return (
    <div className="inner-page page-width">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <span>Saved pieces</span>
      </div>
      <Reveal className="page-intro">
        <h1>Saved pieces</h1>
        <p>Your personal edit. Ready when you are.</p>
      </Reveal>
      {saved.length ? (
        <div className="product-grid shop-products">
          {products
            .filter((p) => saved.includes(p.id))
            .map((p) => (
              <ProductCard product={p} key={p.id} />
            ))}
        </div>
      ) : (
        <EmptyState
          title="YOUR EDIT STARTS HERE."
          text="Tap the heart on any piece to keep it here."
          icon={<Heart size={42} weight="thin" />}
          action={<Button to="/shop">Find your favourites</Button>}
        />
      )}
    </div>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <div className="inner-page page-width contact-page">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <span>Contact</span>
      </div>
      <Reveal className="page-intro">
        <p className="eyebrow">A LITTLE CONVERSATION</p>
        <h1>Get in touch</h1>
        <p>A question about a piece, a size, or your next look? We’re here.</p>
      </Reveal>
      <div className="contact-layout">
        <Reveal className="contact-aside">
          <img
            src={image("editorial")}
            width="700"
            height="680"
            alt="BOSS menswear fabric and jacket details"
          />
          <h2>Here to help</h2>
          <p>
            Questions about fit or the collection? Leave a message below. Our
            contact channels will be available when the store launches.
          </p>
          <Link to="/about" className="text-link">
            A little about Wolf Shop <ArrowUpRight size={16} />
          </Link>
        </Reveal>
        <Reveal className="contact-form-wrap" delay={0.08}>
          {sent ? (
            <div className="form-success" role="status">
              <CheckCircle size={44} weight="thin" />
              <h2>LOOKING GOOD.</h2>
              <p>
                You’ve completed the contact form preview. No message has been
                sent. Live messaging will be connected before launch.
              </p>
              <button className="text-link" onClick={() => setSent(false)}>
                Back to the form <ArrowRight size={17} />
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <h2>How can we help?</h2>
              <div className="form-row">
                <label>
                  First name
                  <input
                    name="firstName"
                    autoComplete="given-name"
                    required
                    placeholder="Your first name"
                    maxLength="60"
                  />
                </label>
                <label>
                  Last name
                  <input
                    name="lastName"
                    autoComplete="family-name"
                    required
                    placeholder="Your last name"
                    maxLength="60"
                  />
                </label>
              </div>
              <label>
                Email address
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  maxLength="254"
                />
              </label>
              <label>
                What’s on your mind?
                <select
                  name="topic"
                  aria-label="What’s on your mind?"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a topic
                  </option>
                  <option>Product & sizing</option>
                  <option>Delivery & returns</option>
                  <option>General enquiry</option>
                  <option>Something else</option>
                </select>
              </label>
              <label>
                Your message
                <textarea
                  name="message"
                  required
                  minLength="10"
                  maxLength="3000"
                  rows="5"
                  placeholder="Tell us a little more..."
                />
              </label>
              <label className="checkbox-label">
                <input required type="checkbox" name="consent" />
                <span>
                  I agree to the <Link to="/privacy">privacy information</Link>.
                </span>
              </label>
              <Button type="submit">Preview message</Button>
              <p className="form-note">
                Frontend preview. This form does not send messages.
              </p>
            </form>
          )}
        </Reveal>
      </div>
      <section className="faq-section">
        <Reveal>
          <h2>A FEW THINGS TO KNOW.</h2>
        </Reveal>
        <div className="faq-grid">
          <details>
            <summary>
              Are these original brand products? <Plus size={20} />
            </summary>
            <p>
              No. Wolf Shop’s planned collection consists of 1:1 replica styles.
              We are independent of the referenced brands and do not claim brand
              authorisation.
            </p>
          </details>
          <details>
            <summary>
              Can I place an order here? <Plus size={20} />
            </summary>
            <p>
              This is a frontend preview. You can explore, save pieces, and
              build your bag, but checkout and payments are not connected.
            </p>
          </details>
          <details>
            <summary>
              How do I choose the right size? <Plus size={20} />
            </summary>
            <p>
              Each product has a size selector and an illustrative size guide.
              Final garment measurements will be confirmed when the actual
              inventory is added.
            </p>
          </details>
          <details>
            <summary>
              Where can I find delivery information? <Plus size={20} />
            </summary>
            <p>
              Confirmed delivery areas, costs, and return terms will be
              published before the store starts taking orders.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}

function About() {
  return (
    <div className="inner-page page-width about-page">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <span>About Wolf Shop</span>
      </div>
      <Reveal className="page-intro">
        <p className="eyebrow">AN INDIVIDUAL POINT OF VIEW</p>
        <h1>
          Style is personal.
          <br />
          <span className="accent">Keep it that way.</span>
        </h1>
      </Reveal>
      <Reveal className="about-image">
        <img
          src={image("hero")}
          width="1600"
          height="900"
          alt="A model wearing a dark BOSS hoodie with jacquard details"
        />
      </Reveal>
      <Reveal className="about-manifesto">
        <img
          src={asset("/logos/wolf-ticket-light.svg")}
          alt=""
          width="64"
          height="64"
        />
        <div>
          <h2>The Wolf Shop way.</h2>
          <p>
            Good style starts with the pieces you actually want to wear. The
            hoodie you reach for. The T-shirt that works with everything. A
            wardrobe that feels like you.
          </p>
          <p>
            Wolf Shop brings a focused edit of menswear into one place, with
            clean silhouettes, understated essentials, and the occasional
            statement.
          </p>
          <Button to="/shop">Make it your own</Button>
        </div>
      </Reveal>
      <div className="shop-disclosure">
        Our planned collection features 1:1 replica styles. All referenced brand
        names belong to their respective owners. Wolf Shop is an independent
        store, with no claim of brand affiliation or authorisation.
      </div>
    </div>
  );
}

function InfoPage({ privacy = false }) {
  const { source } = useCatalog();
  return (
    <div className="inner-page page-width info-page" data-reveal="">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <span>{privacy ? "Privacy information" : "Delivery & returns"}</span>
      </div>
      <h1>{privacy ? "Privacy information" : "Delivery & returns"}</h1>
      {privacy ? (
        <>
          <h2>What this preview stores</h2>
          <p>
            Your shopping bag, saved pieces, and cookie consent choice are
            stored in your own browser’s local storage. They stay on your device
            and can be removed by clearing this site’s browser data.
          </p>
          <h2>Forms and payments</h2>
          <p>
            The contact form is a demonstration. It does not send or save your
            name, email address, or message to a server. No payment information
            is collected.
          </p>
          <h2>Cookies and choices</h2>
          <p>
            This preview does not install analytics or advertising cookies. Bag
            and saved-item storage support features you request. Your cookie
            choice is remembered for up to 180 days. Accepting optional cookies
            currently enables no additional tracking. Use Cookie settings in the
            footer to review or change your choice.
          </p>
          <CookieSettingsButton />
          {source === "database" && (
            <>
              <h2>Accounts</h2>
              <p>
                Customer accounts store a name, email address, password hash and
                sessions in the local database. Staff accounts also record
                product and stock activity. Signing in sets an eight-hour
                session cookie for the relevant account. Sign out to end your
                session. Customer and staff access are separate. Email
                verification and account recovery are not connected in this
                preview.
              </p>
            </>
          )}
          <h2>Before the store launches</h2>
          <p>
            Final store contact information, data handling terms, and any
            required notices will be published before live ordering is enabled.
          </p>
        </>
      ) : (
        <>
          <h2>A storefront preview</h2>
          <p>
            You can explore the collection, save your favourite pieces, and add
            items to your bag. Checkout is not connected and no orders or
            payments are accepted.
          </p>
          <h2>Delivery and returns</h2>
          <p>
            Confirmed delivery areas, shipping costs, delivery estimates, and
            return conditions will be added before launch.
          </p>
          <h2>Product information</h2>
          <p>
            Styles, imagery, sizes, and prices shown here are illustrative.
            Final stock details and garment measurements will be confirmed when
            inventory is added. The collection features 1:1 replica styles, not
            original products from the referenced brands.
          </p>
        </>
      )}
      <Button to="/contact" className="button-outline">
        Get in touch
      </Button>
    </div>
  );
}

function EmptyState({ title, text, action, icon }) {
  return (
    <div className="empty-state">
      {icon}
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}

function NotFound() {
  return (
    <div className="inner-page page-width">
      <EmptyState
        title="A WRONG TURN. GOOD STYLE AHEAD."
        text="We couldn’t find that page. The collection is a good place to start."
        action={<Button to="/shop">Back to the collection</Button>}
      />
    </div>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-width">
        <div className="footer-top" data-reveal="">
          <div className="footer-brand">
            <Link to="/" aria-label="Wolf Shop home">
              <img
                src={asset("/logos/wolf-full-light.svg")}
                alt="Wolf Shop"
                width="180"
                height="63"
              />
            </Link>
            <p>Wear your own statement.</p>
          </div>
          <div className="footer-links">
            <div>
              <h3>THE COLLECTION</h3>
              <Link to="/shop?edit=new">New arrivals</Link>
              <Link to="/shop?category=T-Shirts">T-shirts</Link>
              <Link to="/shop?category=Hoodies">Hoodies</Link>
              <Link to="/shop?category=Sweatshirts">Sweatshirts</Link>
              <Link to="/shop?edit=sale">Sale</Link>
            </div>
            <div>
              <h3>HERE TO HELP</h3>
              <Link to="/contact">Contact us</Link>
              <Link to="/faq">Common questions</Link>
              <Link to="/delivery">Delivery & returns</Link>
              <Link to="/saved">Saved pieces</Link>
              <Link to="/privacy">Privacy information</Link>
              <CookieSettingsButton />
            </div>
            <div>
              <h3>THE WORLD OF WOLF</h3>
              <Link to="/about">Our story</Link>
              {import.meta.env.DEV && <Link to="/login">Staff workspace</Link>}
              <Link to="/brands">Explore the brands</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} WOLF SHOP</span>
          <span>Independent style. Individual expression.</span>
          <span>EN / EUR €</span>
        </div>
        <p className="footer-disclosure">
          Frontend preview with illustrative products and prices. 1:1 replica
          styles. Wolf Shop is not affiliated with the brands shown.
        </p>
      </div>
    </footer>
  );
}

function Overlay({ type: overlay }) {
  const { products } = useCatalog();
  const { setOverlay, bag: storedBag, setBag } = useContext(Store);
  const bag = storedBag.filter((item) =>
    products.some((p) => p.id === item.id),
  );
  const dialog = useRef();
  const [query, setQuery] = useState("");
  const [checkoutPreview, setCheckoutPreview] = useState(false);
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const searchResults = query.trim()
    ? products.filter((p) =>
        `${p.name} ${p.brand} ${p.category}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : [];
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  const close = () => setOverlay(null);
  const go = (url) => {
    close();
    navigate(url);
  };
  const total = bag.reduce(
    (sum, item) =>
      sum + products.find((p) => p.id === item.id).price * item.quantity,
    0,
  );
  const isSearch = overlay === "search";
  return (
    <motion.dialog
      ref={dialog}
      className={`store-dialog ${isSearch ? "search-dialog" : overlay === "size" ? "size-dialog" : "side-dialog"}`}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target !== dialog.current) return;
        const box = dialog.current.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          close();
      }}
      initial={{
        opacity: reduced ? 0 : 1,
        transform: reduced
          ? "none"
          : isSearch
            ? "translateY(-24px)"
            : overlay === "size"
              ? "translateY(16px)"
              : "translateX(100%)",
      }}
      animate={{ opacity: 1, transform: "translate(0px, 0px)" }}
      exit={{
        opacity: 0,
        transform: reduced
          ? "none"
          : isSearch
            ? "translateY(-24px)"
            : overlay === "size"
              ? "translateY(16px)"
              : "translateX(100%)",
      }}
      transition={{ duration: 0.28, ease }}
    >
      <div className="dialog-heading">
        <h2 id="dialog-title">
          {overlay === "bag"
            ? `YOUR BAG (${bag.reduce((sum, item) => sum + item.quantity, 0)})`
            : overlay === "search"
              ? "FIND YOUR NEXT PIECE."
              : overlay === "size"
                ? "FIND YOUR FIT."
                : "EXPLORE WOLF."}
        </h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={24} />
        </button>
      </div>
      {overlay === "search" && (
        <>
          <form
            className="search-form"
            onSubmit={(event) => {
              event.preventDefault();
              go(`/shop?q=${encodeURIComponent(query.trim())}`);
            }}
          >
            <MagnifyingGlass size={25} />
            <input
              aria-label="Search products"
              placeholder="Try a brand, a hoodie, a new favourite..."
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength="100"
            />
            <button aria-label="See all search results" type="submit">
              <ArrowRight size={24} />
            </button>
          </form>
          {query.trim() ? (
            <div className="search-results" aria-live="polite">
              {searchResults.length ? (
                <>
                  {searchResults.map((p) => (
                    <button key={p.id} onClick={() => go(`/product/${p.id}`)}>
                      <img src={image(p.image)} alt="" width="65" height="80" />
                      <span>
                        <strong>{p.brand}</strong>
                        <span>{p.name}</span>
                      </span>
                      <span>{money(p.price)}</span>
                      <ArrowUpRight size={17} />
                    </button>
                  ))}
                  <button
                    className="text-link"
                    onClick={() =>
                      go(`/shop?q=${encodeURIComponent(query.trim())}`)
                    }
                  >
                    All results <ArrowRight size={16} />
                  </button>
                </>
              ) : (
                <p className="search-empty">
                  No pieces found. Try “hoodie”, “Diesel”, or “T-shirt”.
                </p>
              )}
            </div>
          ) : (
            <div className="popular-searches">
              <span>POPULAR RIGHT NOW</span>
              {["Hoodies", "BOSS", "DIESEL", "T-Shirts"].map((term) => (
                <button key={term} onClick={() => setQuery(term)}>
                  {term} <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {overlay === "bag" &&
        (bag.length ? (
          <>
            <div className="bag-items">
              {bag.map((item) => {
                const p = products.find((p) => p.id === item.id);
                const stock = p.stock?.[item.size];
                const limit = stock?.tracked
                  ? Math.min(10, stock.available)
                  : 10;
                return (
                  <div className="bag-item" key={item.id + item.size}>
                    <Link to={`/product/${p.id}`} onClick={close}>
                      <img
                        src={image(p.image)}
                        alt={p.name}
                        width="105"
                        height="135"
                      />
                    </Link>
                    <div>
                      <span className="product-brand">{p.brand}</span>
                      <Link to={`/product/${p.id}`} onClick={close}>
                        {p.name}
                      </Link>
                      <span className="bag-item-size">
                        {p.color} / Size {item.size}
                      </span>
                      <div className="quantity-control">
                        <button
                          aria-label={`Decrease quantity of ${p.name} in size ${item.size}`}
                          onClick={() =>
                            setBag((previous) =>
                              previous.flatMap((i) =>
                                i === item
                                  ? i.quantity > 1
                                    ? [{ ...i, quantity: i.quantity - 1 }]
                                    : []
                                  : [i],
                              ),
                            )
                          }
                        >
                          <Minus size={13} />
                        </button>
                        <span aria-label="Quantity">{item.quantity}</span>
                        <button
                          aria-label={`Increase quantity of ${p.name} in size ${item.size}`}
                          disabled={item.quantity >= limit}
                          onClick={() =>
                            setBag((previous) =>
                              previous.map((i) =>
                                i === item
                                  ? {
                                      ...i,
                                      quantity: Math.min(limit, i.quantity + 1),
                                    }
                                  : i,
                              ),
                            )
                          }
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="bag-item-price">
                      <span>{money(p.price * item.quantity)}</span>
                      <button
                        aria-label={`Remove ${p.name} in size ${item.size} from bag`}
                        className="icon-button"
                        onClick={() =>
                          setBag((previous) =>
                            previous.filter((i) => i !== item),
                          )
                        }
                      >
                        <Trash size={17} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bag-summary">
              <div>
                <span>Subtotal</span>
                <strong>{money(total)}</strong>
              </div>
              <p>Sample prices. Shipping is not yet configured.</p>
              <Button onClick={() => setCheckoutPreview(true)}>
                Preview checkout
              </Button>
              {checkoutPreview && (
                <p className="checkout-preview" role="status">
                  Your bag is ready. Checkout will open when the store launches.
                  No payment has been taken.
                </p>
              )}
              <p className="bag-preview-note">
                This is a frontend preview. No orders or payments are taken.
              </p>
              <button
                className="text-link continue-shopping"
                onClick={() => go("/shop")}
              >
                Continue exploring <ArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <EmptyState
            title="ROOM FOR SOMETHING GOOD."
            text="Your bag is waiting for its first piece."
            icon={<ShoppingBag size={45} weight="thin" />}
            action={
              <Button onClick={() => go("/shop")}>
                Explore the collection
              </Button>
            }
          />
        ))}
      {overlay === "menu" && (
        <nav className="mobile-menu" aria-label="Mobile navigation">
          {[
            ["Shop", "/shop"],
            ["Sale", "/shop?edit=sale"],
            ["Contact us", "/contact"],
            ["Common questions", "/faq"],
          ].map(([label, url]) => (
            <Link key={label} to={url} onClick={close}>
              {label}
              <ArrowUpRight size={23} />
            </Link>
          ))}
          <Link className="mobile-saved" to="/saved" onClick={close}>
            <Heart size={20} /> Saved pieces
          </Link>
        </nav>
      )}
      {overlay === "size" && (
        <div className="size-guide">
          <p>
            Illustrative menswear sizing. Measure a favourite garment laid flat
            and compare the chest width.
          </p>
          <div className="table-scroll">
            <table>
              <caption>Example garment measurements in centimetres</caption>
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Chest width</th>
                  <th>Length</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["S", "52", "68"],
                  ["M", "55", "70"],
                  ["L", "58", "72"],
                  ["XL", "61", "74"],
                  ["XXL", "64", "76"],
                ].map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, i) =>
                      i === 0 ? (
                        <th key={i} scope="row">
                          {cell}
                        </th>
                      ) : (
                        <td key={i}>{cell}</td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="form-note">
            These are example measurements, not confirmed product
            specifications. Final measurements will be added with stock.
          </p>
          <button className="text-link" onClick={() => go("/contact")}>
            Need a hand? Get in touch <ArrowRight size={15} />
          </button>
        </div>
      )}
    </motion.dialog>
  );
}

function App() {
  const { products } = useCatalog();
  const rawLocation = useLocation();
  const location = {
    ...rawLocation,
    pathname: rawLocation.pathname.replace(/\/+$/, "") || "/",
  };
  const { overlay, notice, setOverlay, dismissNotice } = useContext(Store);
  const reduced = useReducedMotion();
  // A fresh document always gets the opening; in-app navigation never replays it.
  const [opening, setOpening] = useState(() =>
    /^\/account(\/|$)/.test(location.pathname) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "complete"
      : "arriving",
  );
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    if (reduced) {
      setOpening("complete");
      return;
    }
    if (originEnabled) return;
    const timers = [];
    const wait = (ms) =>
      new Promise((resolve) => timers.push(setTimeout(resolve, ms)));
    let cancelled = false;
    if (opening === "arriving") {
      const images = [
        ...document.querySelectorAll(".opening-logo, .hero-image.is-active"),
      ];
      const assets = Promise.all([
        document.fonts.ready,
        ...images.map((img) => img.decode().catch(() => {})),
      ]);
      Promise.all([wait(1450), Promise.race([assets, wait(2300)])]).then(() => {
        if (!cancelled) setOpening("departing");
      });
    } else if (opening === "departing") {
      // CSS transitionend is primary; the timer also releases a backgrounded tab.
      timers.push(setTimeout(() => setOpening("complete"), 750));
    }
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [opening, reduced]);
  useEffect(() => {
    // A different page resets after its exit; filters reset without a page transition.
    if (previousPath.current === location.pathname)
      window.scrollTo({ top: 0, behavior: "instant" });
    previousPath.current = location.pathname;
    const titles = {
      "/": "Wear your own statement.",
      "/shop": "The collection",
      "/brands": "Explore the brands",
      "/contact": "Contact us",
      "/faq": "Common questions",
      "/about": "Our story",
      "/saved": "Your saved pieces",
      "/delivery": "Delivery & returns",
      "/privacy": "Privacy information",
      "/account": "Your account",
      "/account/sign-in": "Sign in",
      "/account/create": "Create account",
    };
    const product = location.pathname.startsWith("/product/")
      ? products.find((p) => p.id === location.pathname.split("/")[2])
      : null;
    document.title = `${product ? `${product.brand} ${product.name}` : titles[location.pathname] || "Discover your style"} | Wolf Shop`;
  }, [location.pathname, location.search, products]);
  useEffect(() => {
    setOverlay(null);
  }, [location.pathname, location.search]);
  let page;
  if (location.pathname === "/") page = <Home ready={opening !== "arriving"} />;
  else if (location.pathname === "/shop") page = <Shop />;
  else if (location.pathname.startsWith("/product/"))
    page = <Product id={location.pathname.split("/")[2]} />;
  else if (location.pathname === "/brands") page = <Brands />;
  else if (location.pathname === "/saved") page = <Saved />;
  else if (location.pathname === "/contact") page = <Contact />;
  else if (location.pathname === "/faq") page = <FAQ />;
  else if (location.pathname === "/about") page = <About />;
  else if (location.pathname === "/privacy") page = <InfoPage privacy />;
  else if (location.pathname === "/delivery") page = <InfoPage />;
  else if (/^\/account(\/|$)/.test(location.pathname))
    page = (
      <React.Suspense
        fallback={
          <div className="inner-page page-width" role="status">
            Opening your account…
          </div>
        }
      >
        <CustomerAccount />
      </React.Suspense>
    );
  else page = <NotFound />;
  return (
    <MotionConfig reducedMotion="user">
      <BackgroundMarks />
      <SmoothExperience blocked={opening !== "complete" || Boolean(overlay)} />
      <RedPointer />
      <DetailReveals route={location.pathname} />
      <ScrollDetails ready={opening === "complete"} route={location.pathname} />
      <div
        className="site-shell"
        data-opening={opening}
        inert={opening !== "complete"}
      >
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <AnimatePresence
          initial={false}
          mode="wait"
          onExitComplete={() =>
            window.scrollTo({ top: 0, behavior: "instant" })
          }
        >
          <motion.main
            id="main"
            key={location.pathname}
            className="route-content"
            tabIndex={-1}
            initial={{
              opacity: reduced ? 1 : 0,
              transform: reduced ? "none" : "translateY(12px)",
            }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{
              opacity: reduced ? 1 : 0,
              transform: reduced ? "none" : "translateY(-8px)",
              transition: { duration: reduced ? 0 : 0.14, ease },
            }}
            transition={{ duration: reduced ? 0 : 0.28, ease }}
          >
            {page}
          </motion.main>
        </AnimatePresence>
        <Footer />
        <AnimatePresence>
          {overlay && <Overlay key={overlay} type={overlay} />}
        </AnimatePresence>
        <div
          className={`notice ${notice ? "notice-visible" : ""}`}
          role="status"
          aria-live="polite"
        >
          {notice && (
            <>
              <CheckCircle size={22} />
              <p>{notice}</p>
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={dismissNotice}
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>
      </div>
      <CookieConsent ready={opening === "complete"} />
      {opening !== "complete" &&
        (originEnabled ? (
          <OriginEntrance
            onReveal={() => setOpening("departing")}
            onComplete={() => setOpening("complete")}
          />
        ) : (
          <Opening phase={opening} onComplete={() => setOpening("complete")} />
        ))}
    </MotionConfig>
  );
}

const AdminApp = React.lazy(() => import("./admin/AdminApp"));
const StaticAdmin = React.lazy(() => import("./admin/StaticAdmin"));
const CustomerAccount = React.lazy(() => import("./customer/CustomerAccount"));
function Root() {
  const location = useLocation();
  const staff = /^\/(login|admin)(\/|$)/.test(location.pathname);
  return staff ? (
    <React.Suspense
      fallback={
        <main className="workspace-loading" role="status">
          Opening workspace…
        </main>
      }
    >
      {staticPreview ? <StaticAdmin /> : <AdminApp />}
    </React.Suspense>
  ) : (
    <App />
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || "/"}>
    <ThemeProvider>
      <CatalogProvider>
        <StoreProvider>
          <Root />
        </StoreProvider>
      </CatalogProvider>
    </ThemeProvider>
  </BrowserRouter>,
);
