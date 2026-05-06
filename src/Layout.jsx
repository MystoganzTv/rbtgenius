import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/lib/AuthContext";
import useIsMobile from "@/hooks/use-mobile";

export default function Layout({ children, currentPageName }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const plan = user?.plan || "free";
  const isAdmin = user?.role === "admin";

  // Mobile layout: bottom tab bar, safe areas, native feel
  if (isMobile) {
    return (
      <MobileLayout currentPageName={currentPageName}>
        {children}
      </MobileLayout>
    );
  }

  // Desktop layout: sidebar + topbar
  if (currentPageName === "Pricing") {
    return (
      <div className="dark-dashboard-grid min-h-screen bg-[#F8FAFC] text-foreground transition-colors dark:bg-background">
        {children}
      </div>
    );
  }

  return (
    <div className="dark-dashboard-grid min-h-screen bg-[#F8FAFC] text-foreground transition-colors dark:bg-background">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden dark:bg-black/60"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="hidden lg:block">
        <Sidebar currentPage={currentPageName} isAdmin={isAdmin} plan={plan} />
      </div>

      <div className={sidebarOpen ? "lg:hidden block" : "hidden lg:hidden"}>
        <Sidebar currentPage={currentPageName} isAdmin={isAdmin} plan={plan} />
      </div>

      <div className="transition-all duration-300 lg:ml-[260px]">
        <TopBar
          onMenuClick={() => setSidebarOpen((current) => !current)}
          user={user}
          plan={plan}
          onLogout={() => logout()}
        />

        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
