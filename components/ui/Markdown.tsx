"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ComponentPropsWithoutRef } from "react";

/**
 * Rich markdown renderer styled to the dashboard design system.
 * Supports GFM: headings, lists, tables, blockquotes, code, bold/italic, links.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="ai-markdown" style={{ color: "var(--color-ink)", fontSize: 14, lineHeight: 1.7 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 style={{ fontSize: 20, fontWeight: 700, margin: "16px 0 8px", color: "var(--color-ink)" }} {...p} />,
          h2: (p) => <h2 style={{ fontSize: 17, fontWeight: 700, margin: "16px 0 8px", color: "var(--color-ink)" }} {...p} />,
          h3: (p) => <h3 style={{ fontSize: 15, fontWeight: 700, margin: "12px 0 6px", color: "var(--color-ink)" }} {...p} />,
          p: (p) => <p style={{ margin: "8px 0" }} {...p} />,
          ul: (p) => <ul style={{ margin: "8px 0", paddingLeft: 22, listStyleType: "disc" }} {...p} />,
          ol: (p) => <ol style={{ margin: "8px 0", paddingLeft: 22, listStyleType: "decimal" }} {...p} />,
          li: (p) => <li style={{ margin: "4px 0" }} {...p} />,
          strong: (p) => <strong style={{ fontWeight: 700, color: "var(--color-ink)" }} {...p} />,
          em: (p) => <em style={{ fontStyle: "italic" }} {...p} />,
          a: (p) => (
            <a
              style={{ color: "var(--color-primary)", textDecoration: "underline", textUnderlineOffset: 2 }}
              target="_blank"
              rel="noopener noreferrer"
              {...p}
            />
          ),
          blockquote: (p) => (
            <blockquote
              style={{
                borderLeft: "3px solid var(--color-primary)",
                paddingLeft: 14,
                margin: "10px 0",
                color: "var(--color-muted)",
                fontStyle: "italic",
              }}
              {...p}
            />
          ),
          hr: () => <hr style={{ border: "none", borderTop: "1px solid var(--color-hairline)", margin: "14px 0" }} />,
          code: ({ className, children, ...props }: ComponentPropsWithoutRef<"code"> & { inline?: boolean }) => {
            const isBlock = className?.includes("language-") || String(children).includes("\n");
            if (isBlock) {
              return (
                <code
                  className={className}
                  style={{
                    display: "block",
                    background: "var(--color-canvas)",
                    border: "1px solid var(--color-hairline)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    fontSize: 12.5,
                    fontFamily: "var(--font-geist-mono, ui-monospace, monospace)",
                    overflowX: "auto",
                    margin: "10px 0",
                    lineHeight: 1.6,
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                style={{
                  background: "var(--color-canvas)",
                  borderRadius: 5,
                  padding: "1px 6px",
                  fontSize: 12.5,
                  fontFamily: "var(--font-geist-mono, ui-monospace, monospace)",
                  color: "var(--color-primary-ink)",
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          table: (p) => (
            <div style={{ overflowX: "auto", margin: "12px 0" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                  border: "1px solid var(--color-hairline)",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
                {...p}
              />
            </div>
          ),
          thead: (p) => <thead style={{ background: "var(--color-canvas)" }} {...p} />,
          th: (p) => (
            <th
              style={{
                textAlign: "left",
                fontWeight: 700,
                padding: "8px 12px",
                borderBottom: "1px solid var(--color-hairline)",
                color: "var(--color-ink)",
              }}
              {...p}
            />
          ),
          td: (p) => (
            <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--color-hairline)" }} {...p} />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
