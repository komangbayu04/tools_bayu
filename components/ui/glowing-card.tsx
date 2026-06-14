"use client";

import { Icon, type IconName } from "@/components/ui/icon";

/**
 * Brand-colored glowing highlight card. Use sparingly — only for the single
 * most important highlight on a page. A slow conic-gradient ring sweeps behind
 * a dark teal surface, leaving a glowing animated border.
 */
export function GlowCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glow-card ${className ?? ""}`}>
      <span className="glow-ring" aria-hidden />
      <div className="glow-surface">{children}</div>

      <style jsx>{`
        .glow-card {
          position: relative;
          border-radius: 22px;
          padding: 1.5px;
          overflow: hidden;
          background: #0c2725;
          isolation: isolate;
        }
        .glow-ring {
          position: absolute;
          inset: -60%;
          z-index: 0;
          background: conic-gradient(
            from 0deg,
            transparent 0%,
            rgba(42, 157, 143, 0.0) 8%,
            #2a9d8f 20%,
            #6fe3d2 27%,
            #2a9d8f 34%,
            transparent 46%,
            transparent 100%
          );
          animation: glow-spin 6s linear infinite;
        }
        @keyframes glow-spin {
          to {
            transform: rotate(360deg);
          }
        }
        .glow-surface {
          position: relative;
          z-index: 1;
          border-radius: 20.5px;
          height: 100%;
          background:
            radial-gradient(120% 100% at 0% 0%, rgba(42, 157, 143, 0.28), transparent 55%),
            radial-gradient(120% 100% at 100% 100%, rgba(28, 79, 79, 0.55), transparent 60%),
            #0c2725;
        }
      `}</style>
    </div>
  );
}

/** A single stat block used inside the GlowCard hero bar. */
export function GlowStat({
  icon,
  value,
  label,
}: {
  icon: IconName;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(111,227,210,0.14)" }}
      >
        <Icon name={icon} size={17} style={{ color: "#6fe3d2" }} />
      </div>
      <div className="min-w-0">
        <p className="text-[18px] font-bold leading-none text-white truncate">{value}</p>
        <p className="text-[11px] mt-1 truncate" style={{ color: "rgba(255,255,255,0.6)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}
