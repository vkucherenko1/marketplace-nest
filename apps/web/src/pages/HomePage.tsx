import { useState } from "react";
import { CatalogSection } from "../features/catalog/CatalogSection";
import { RecentProducts } from "../features/product/RecentProducts";
import { Hero } from "../layout/Hero";
import { readRecent } from "../storage";

export function HomePage() {
  const [recentProducts] = useState(readRecent);
  return (
    <>
      <Hero />
      <CatalogSection />
      <RecentProducts products={recentProducts} />
    </>
  );
}
