// Original brand photography. Shega's sample replica prices are illustrative.
export const products = [
  {
    id: "boss-signature-hoodie",
    brand: "BOSS",
    name: "Double B jacquard hoodie",
    category: "Hoodies",
    price: 79,
    image: "boss-striped-0",
    alternate: "boss-striped-4",
    gallery: [
      "boss-striped-0",
      "boss-striped-1",
      "boss-striped-4",
      "boss-striped-3",
    ],
    color: "Midnight",
    hex: "#25272d",
    sizes: ["S", "M", "L", "XL", "XXL"],
    fresh: true,
    description:
      "Subtle jacquard stripes, a crest-style Double B monogram, and a relaxed silhouette with a sporty point of view.",
  },
  {
    id: "diesel-essential-tee",
    brand: "DIESEL",
    name: "T-Boxt distressed logo T-shirt",
    category: "T-Shirts",
    price: 45,
    image: "diesel-special-117",
    alternate: "diesel-special-119",
    gallery: ["diesel-special-117", "diesel-special-119"],
    color: "Washed blue",
    hex: "#a7bdc5",
    sizes: ["S", "M", "L", "XL"],
    fresh: true,
    description:
      "A distressed flocked logo and a washed finish give this relaxed T-shirt its character. Easy to wear, impossible to overlook.",
  },
  {
    id: "ea7-core-sweatshirt",
    brand: "DIESEL",
    name: "S-Mart graphic sweatshirt",
    category: "Sweatshirts",
    price: 65,
    oldPrice: 79,
    image: "diesel-sweat-14",
    alternate: "diesel-sweat-15",
    gallery: ["diesel-sweat-14", "diesel-sweat-15"],
    color: "Black",
    hex: "#272727",
    sizes: ["S", "M", "L", "XL", "XXL"],
    fresh: false,
    description:
      "Detailed graphic artwork across the chest brings a vintage concert-poster feel to a relaxed black sweatshirt.",
  },
  {
    id: "boss-ivory-hoodie",
    brand: "EMPORIO ARMANI",
    name: "Oversized EA embroidery hoodie",
    category: "Hoodies",
    price: 79,
    image: "armani-sweat-5",
    alternate: "armani-sweat-4",
    gallery: ["armani-sweat-5", "armani-sweat-4"],
    color: "Black",
    hex: "#222222",
    sizes: ["S", "M", "L", "XL"],
    fresh: true,
    description:
      "A statement embroidered EA motif, substantial French-terry texture, and a clean, relaxed shape.",
  },
  {
    id: "hugo-statement-tee",
    brand: "HUGO",
    name: "Front & back graphic hoodie",
    category: "Hoodies",
    price: 59,
    oldPrice: 75,
    image: "hugo-graphic-1",
    alternate: "hugo-graphic-0",
    gallery: ["hugo-graphic-1", "hugo-graphic-0", "hugo-graphic-4"],
    color: "Black",
    hex: "#252525",
    sizes: ["S", "M", "L", "XL"],
    fresh: false,
    description:
      "A minimal front, a statement back. Contrasting graphics and an easy, structured silhouette make this hoodie stand out.",
  },
  {
    id: "armani-essential-tee",
    brand: "EMPORIO ARMANI",
    name: "Graphic embroidery T-shirt",
    category: "T-Shirts",
    price: 45,
    image: "armani-graphic-3",
    alternate: "armani-graphic-0",
    gallery: [
      "armani-graphic-3",
      "armani-graphic-4",
      "armani-graphic-0",
      "armani-graphic-2",
    ],
    color: "White",
    hex: "#eeede7",
    sizes: ["S", "M", "L", "XL", "XXL"],
    fresh: true,
    description:
      "An abstract graphic blends print and embroidery on a crisp white T-shirt. A considered detail with an individual feel.",
  },
  {
    id: "diesel-oval-devore-sweatshirt",
    brand: "DIESEL",
    name: "Oval D dévoré sweatshirt",
    category: "Sweatshirts",
    price: 69,
    image: "diesel-sweat-16",
    alternate: "diesel-sweat-17",
    gallery: ["diesel-sweat-16", "diesel-sweat-17"],
    color: "Washed black",
    hex: "#333332",
    sizes: ["S", "M", "L", "XL"],
    fresh: true,
    description:
      "An oversized, distressed Oval D graphic with a worn-in texture. A distinctive layer with just the right amount of attitude.",
  },
  {
    id: "diesel-d78-burnout-tee",
    brand: "DIESEL",
    name: "D78 burnout graphic T-shirt",
    category: "T-Shirts",
    price: 49,
    image: "diesel-special-105",
    alternate: "diesel-special-107",
    gallery: ["diesel-special-105", "diesel-special-107"],
    color: "Light blue",
    hex: "#a9bcc3",
    sizes: ["S", "M", "L", "XL"],
    fresh: true,
    description:
      "A textured burnout finish and a bold D78 print bring depth to a pale blue, relaxed T-shirt.",
  },
];

export const brands = ["BOSS", "DIESEL", "EMPORIO ARMANI", "HUGO"];
export const brandLogos = {
  BOSS: `${import.meta.env?.BASE_URL || "/"}/logos/brands/boss.png`.replace(
    /\/\/+/g,
    "/",
  ),
  DIESEL: `${import.meta.env?.BASE_URL || "/"}/logos/brands/diesel.svg`.replace(
    /\/\/+/g,
    "/",
  ),
  "EMPORIO ARMANI":
    `${import.meta.env?.BASE_URL || "/"}/logos/brands/armani.svg`.replace(
      /\/\/+/g,
      "/",
    ),
  HUGO: `${import.meta.env?.BASE_URL || "/"}/logos/brands/hugo.png`.replace(
    /\/\/+/g,
    "/",
  ),
};
export const categories = ["All pieces", "T-Shirts", "Hoodies", "Sweatshirts"];
export const money = (number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(number);
