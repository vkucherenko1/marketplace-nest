import { Outlet } from "react-router-dom";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
