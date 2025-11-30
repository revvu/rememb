import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deep Learning System",
  description: "A distraction-free learning environment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        suppressHydrationWarning
        className="font-sans antialiased bg-background text-foreground selection:bg-primary/20 selection:text-primary"
      >
        {children}
      </body>
    </html>
  );
}
