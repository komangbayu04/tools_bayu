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
        <div className="p-6 md:p-[52px] min-h-full">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
