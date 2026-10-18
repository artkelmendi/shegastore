// Explicit families prevent unrelated products with similar names being merged.
export const colorFamilies = {
  "ax-city-frame": [
    "armani-exchange-black-tshirt",
    "armani-exchange-off-white-tshirt",
  ],
};
const familyKey = (product) =>
  product.colorGroup ||
  Object.keys(colorFamilies).find((key) =>
    colorFamilies[key].includes(product.id),
  ) ||
  product.id;
export function getColorways(product, products) {
  return products.filter(
    (item) =>
      familyKey(item) === familyKey(product) &&
      item.brand === product.brand &&
      item.category === product.category,
  );
}
export function uniqueStyles(products) {
  const seen = new Set();
  return products.filter((product) => {
    const key = `${product.brand}:${product.category}:${familyKey(product)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
