// Wolf Shop supplied campaign photos. Names and prices are illustrative.
export const products = [
  {
    id: "boss-black-zip-knit",
    brand: "BOSS",
    name: "Midnight zip-through knit",
    category: "Knitwear",
    price: 65,
    image: "wolf-collection/boss-black-zip-knit/front",
    alternate: "wolf-collection/boss-black-zip-knit/detail",
    gallery: [
      "wolf-collection/boss-black-zip-knit/front",
      "wolf-collection/boss-black-zip-knit/detail",
      "wolf-collection/boss-black-zip-knit/back",
    ],
    color: "Black",
    hex: "#191919",
    sizes: ["S", "M", "L", "XL", "XXL"],
    fresh: true,
    description:
      "A black zip-through layer with a stand collar, tonal chest logo and ribbed cuffs.",
  },
  {
    id: "boss-blue-tracksuit",
    brand: "BOSS",
    name: "Atlantic zip tracksuit",
    category: "Tracksuits",
    price: 95,
    image: "wolf-collection/boss-blue-tracksuit/front",
    alternate: "wolf-collection/boss-blue-tracksuit/detail",
    gallery: [
      "wolf-collection/boss-blue-tracksuit/front",
      "wolf-collection/boss-blue-tracksuit/detail",
      "wolf-collection/boss-blue-tracksuit/back",
    ],
    color: "Atlantic blue",
    hex: "#244b68",
    sizes: ["S", "M", "L", "XL", "XXL"],
    fresh: true,
    description:
      "A coordinated blue zip jacket and tapered trousers. Wear together or mix with your everyday pieces.",
  },
  {
    id: "boss-off-white-sweatshirt",
    brand: "BOSS",
    name: "Ivory logo crewneck",
    category: "Sweatshirts",
    price: 55,
    image: "wolf-collection/boss-off-white-sweatshirt/front",
    alternate: "wolf-collection/boss-off-white-sweatshirt/detail",
    gallery: [
      "wolf-collection/boss-off-white-sweatshirt/front",
      "wolf-collection/boss-off-white-sweatshirt/detail",
      "wolf-collection/boss-off-white-sweatshirt/back",
    ],
    color: "Off-white",
    hex: "#e9e5dc",
    sizes: ["S", "M", "L", "XL", "XXL"],
    fresh: true,
    description:
      "An off-white crewneck with a small tonal chest logo and a clean, relaxed silhouette.",
  },
  {
    id: "boss-black-geometric-tshirt",
    brand: "BOSS",
    name: "Contour graphic T-shirt",
    category: "T-Shirts",
    price: 39,
    image: "wolf-collection/boss-black-geometric-tshirt/front",
    alternate: "wolf-collection/boss-black-geometric-tshirt/detail",
    gallery: [
      "wolf-collection/boss-black-geometric-tshirt/front",
      "wolf-collection/boss-black-geometric-tshirt/detail",
      "wolf-collection/boss-black-geometric-tshirt/back",
    ],
    color: "Black",
    hex: "#191919",
    sizes: ["S", "M", "L", "XL", "XXL"],
    fresh: true,
    description:
      "A black short-sleeve T-shirt with geometric line artwork and a small BOSS chest mark.",
  },
  {
    id: "diesel-black-core-sweatshirt",
    brand: "DIESEL",
    name: "Core logo crewneck",
    category: "Sweatshirts",
    price: 59,
    image: "wolf-collection/diesel-black-core-sweatshirt/front",
    alternate: "wolf-collection/diesel-black-core-sweatshirt/detail",
    gallery: [
      "wolf-collection/diesel-black-core-sweatshirt/front",
      "wolf-collection/diesel-black-core-sweatshirt/detail",
      "wolf-collection/diesel-black-core-sweatshirt/back",
    ],
    color: "Black",
    hex: "#191919",
    sizes: ["S", "M", "L", "XL", "XXL"],
    fresh: true,
    description:
      "A black crewneck with a bold contrasting DIESEL CORE chest print and ribbed edges.",
  },
  {
    id: "armani-exchange-black-tshirt",
    brand: "ARMANI EXCHANGE",
    name: "City frame T-shirt",
    category: "T-Shirts",
    price: 35,
    image: "wolf-collection/armani-exchange-black-tshirt/front",
    alternate: "wolf-collection/armani-exchange-black-tshirt/detail",
    gallery: [
      "wolf-collection/armani-exchange-black-tshirt/front",
      "wolf-collection/armani-exchange-black-tshirt/detail",
      "wolf-collection/armani-exchange-black-tshirt/back",
    ],
    color: "Black",
    hex: "#191919",
    sizes: ["S", "M", "L", "XL", "XXL"],
    fresh: true,
    description:
      "A black crewneck T-shirt with a layered architectural graphic across the chest.",
  },
  {
    id: "armani-exchange-off-white-tshirt",
    brand: "ARMANI EXCHANGE",
    name: "City frame T-shirt",
    category: "T-Shirts",
    price: 35,
    image: "wolf-collection/armani-exchange-off-white-tshirt/front",
    alternate: "wolf-collection/armani-exchange-off-white-tshirt/detail",
    gallery: [
      "wolf-collection/armani-exchange-off-white-tshirt/front",
      "wolf-collection/armani-exchange-off-white-tshirt/detail",
      "wolf-collection/armani-exchange-off-white-tshirt/back",
    ],
    color: "Off-white",
    hex: "#e9e5dc",
    sizes: ["S", "M", "L", "XL", "XXL"],
    fresh: true,
    description:
      "An off-white crewneck T-shirt with a contrasting architectural chest graphic.",
  },
];

export const brands = ["BOSS", "DIESEL", "ARMANI EXCHANGE"];
export const brandLogos = {
  BOSS: `${import.meta.env?.BASE_URL || "/"}/logos/brands/boss.svg`.replace(
    /\/\/+/g,
    "/",
  ),
  DIESEL:
    `${import.meta.env?.BASE_URL || "/"}/logos/brands/diesel-wordmark.svg`.replace(
      /\/\/+/g,
      "/",
    ),
  "EMPORIO ARMANI":
    `${import.meta.env?.BASE_URL || "/"}/logos/brands/armani.svg`.replace(
      /\/\/+/g,
      "/",
    ),
  HUGO: `${import.meta.env?.BASE_URL || "/"}/logos/brands/hugo.svg`.replace(
    /\/\/+/g,
    "/",
  ),
};
export const categories = [
  "All pieces",
  "T-Shirts",
  "Sweatshirts",
  "Knitwear",
  "Tracksuits",
];
export const money = (number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(number);
