import { Sidebar } from "./Sidebar";
import { PageTransition } from "./PageTransition";

interface ShellLayoutProps {
  children: React.ReactNode;
}

export function ShellLayout({ children }: ShellLayoutProps) {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--color-global-bg)", paddingLeft: 24, paddingTop: 16 }}
    >
      <Sidebar />
      <main
        className="flex-1 overflow-auto"
        style={{
          background: "var(--color-surface)",
          borderTopLeftRadius: 21,
          boxShadow: "-6px 8px 42px 0px rgba(1,135,134,0.10)",
        }}
      >
        <div className="px-6 py-8 md:px-12 md:py-12 min-h-full">
          <div className="mx-auto w-full max-w-[1100px] pb-16 md:pb-0">
            <PageTransition>{children}</PageTransition>
          </div>
        </div>
      </main>
    </div>
  );
}
