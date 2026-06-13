import { Sidebar } from "./Sidebar";
import { PageTransition } from "./PageTransition";

interface ShellLayoutProps {
  children: React.ReactNode;
}

export function ShellLayout({ children }: ShellLayoutProps) {
  return (
    <div className="flex h-screen bg-[#EDF0F2] dark:bg-[#1A2428] overflow-hidden pl-[24px] pt-[16px]">
      <Sidebar />
      <main className="flex-1 bg-white dark:bg-[#1E2B30] rounded-tl-[21px] shadow-[-6px_8px_42px_0px_rgba(1,135,134,0.08)] overflow-auto">
        <div className="p-4 md:p-[52px] min-h-full">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
