import { Outlet } from "react-router-dom";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <Header />
      <main className="pb-24 md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
