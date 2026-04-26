import type { ReactNode } from "react";

export const metadata = {
  title: "Denial Appeal Pro",
  description: "Denial appeal letters",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
