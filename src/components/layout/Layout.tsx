import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export function Layout() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <Navbar />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
