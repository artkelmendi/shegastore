import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { products as preview } from "./data";
import { staticPreview } from "./api";
const Catalog = createContext({ products: preview, source: "preview" });
export function CatalogProvider({ children }) {
  const [state, setState] = useState({
    products: preview,
    source: "preview",
    loading: true,
  });
  const request = useRef(0);
  const refresh = useCallback(async () => {
    if (staticPreview) {
      setState((previous) =>
        previous.loading ? { ...previous, loading: false } : previous,
      );
      return;
    }
    const current = ++request.current;
    try {
      const response = await fetch("/api/catalog", {
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data.products) || current !== request.current) return;
      setState({ products: data.products, source: "database", loading: false });
    } catch {
      /* Static hosting retains the standalone storefront preview. */
    } finally {
      if (current === request.current)
        setState((previous) =>
          previous.loading ? { ...previous, loading: false } : previous,
        );
    }
  }, []);
  useEffect(() => {
    refresh();
    const update = () => refresh();
    window.addEventListener("focus", update);
    window.addEventListener("wolf-catalog-change", update);
    return () => {
      window.removeEventListener("focus", update);
      window.removeEventListener("wolf-catalog-change", update);
    };
  }, [refresh]);
  return (
    <Catalog.Provider value={{ ...state, refresh }}>
      {children}
    </Catalog.Provider>
  );
}
export const useCatalog = () => useContext(Catalog);
