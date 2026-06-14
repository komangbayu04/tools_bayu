interface ShellLayoutProps {
  children: React.ReactNode;
}

/**
 * The app chrome (sidebar + main panel + page transition) now lives in
 * <ShellChrome> at the root layout so it persists across navigation.
 * ShellLayout is kept as a passthrough so existing pages don't need changes.
 */
export function ShellLayout({ children }: ShellLayoutProps) {
  return <>{children}</>;
}
