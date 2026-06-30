import { useState } from "react";
import { PopularCategoryRails } from "../features/catalog/PopularCategoryRails";
import { RecentProducts } from "../features/product/RecentProducts";
import { Hero } from "../layout/Hero";
import { readRecent } from "../storage";

export function HomePage() {
  const [recentProducts] = useState(readRecent);
  return (
    <>
      <Hero />
      <PopularCategoryRails />
      <RecentProducts products={recentProducts} />
    </>
  );
}
