import Sidebar from "../components/ui/Sidebar";
import NotificationBell from "../components/ui/NotificationBell";
import TopBarTitle from "../components/ui/TopBarTitle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-base-100 text-base-content overflow-hidden relative">
      {/* Ambient shell glow — fixed, so it doesn't move or repeat with scroll.
          Lives once here instead of every page re-inventing its own blur. */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[36rem] h-[36rem] bg-primary/[0.05] blur-[140px] rounded-full" />
        <div className="absolute -bottom-40 -left-20 w-[28rem] h-[28rem] bg-primary/[0.04] blur-[130px] rounded-full" />
      </div>

      <div className="relative z-10 flex w-full">
        <Sidebar />
        {/* Content area — this is the ONE scrolling region, so `sticky`
            inside it (topbar, sidebar) has a real scroll container to
            stick against instead of the window. */}
        <div className="flex-1 flex flex-col h-screen overflow-y-auto overflow-x-hidden">
          {/* Compact TopBar for all pages */}
          <div className="relative h-20 px-8 lg:px-10 flex items-center justify-between bg-base-100/60 backdrop-blur-md sticky top-0 z-50 shrink-0">
             <TopBarTitle />
             <NotificationBell />
             <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-primary/40 via-base-content/10 to-transparent" />
          </div>
          <main className="flex-1 p-8 lg:p-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
