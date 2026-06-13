import { Sidebar } from "./Sidebar";

interface ShellLayoutProps {
  children: React.ReactNode;
}

export function ShellLayout({ children }: ShellLayoutProps) {
  return (
    <div className="flex h-screen bg-[#EDF0F2] overflow-hidden">
      <Sidebar />
      <main className="flex-1 bg-white rounded-tl-[21px] shadow-lg overflow-auto">
        <div className="p-[52px] min-h-full">{children}</div>
      </main>
    </div>
  );
}
