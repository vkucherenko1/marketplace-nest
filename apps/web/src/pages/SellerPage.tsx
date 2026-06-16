import { useEffect, useState } from "react";
import type { SellerSummary } from "@marketplace/contracts";
import { Link, useParams } from "react-router-dom";
import { CatalogSection } from "../features/catalog/CatalogSection";

export function SellerPage() {
  const { sellerId = "" } = useParams();
  const [seller, setSeller] = useState<SellerSummary | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`marketplace-seller:${sellerId}`);
      setSeller(stored ? (JSON.parse(stored) as SellerSummary) : null);
    } catch {
      setSeller(null);
    }
  }, [sellerId]);

  return (
    <div className="pt-8">
      <nav className="mx-auto flex max-w-[1500px] items-center gap-2 px-4 text-sm text-ink/50 lg:px-8">
        <Link to="/">Главная</Link>
        <span>/</span>
        <span className="font-semibold text-ink">
          {seller?.name ?? "Товары продавца"}
        </span>
      </nav>
      <CatalogSection
        sellerId={sellerId}
        title={seller ? `Все товары ${seller.name}` : "Все товары продавца"}
        showCategoryFilters
      />
    </div>
  );
}
