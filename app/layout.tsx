import type { Metadata, Viewport } from "next";
import { ThemeInitScript, ThemeProvider } from "@/lib/theme-provider";
import { AppStoreProvider } from "@/lib/app-store";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/lib/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoGrade — AI Evaluation Assistant for Educators",
  description:
    "AI-powered answer sheet evaluation with accuracy, transparency and teacher control.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0e1a" },
    { media: "(prefers-color-scheme: light)", color: "#f7f8fb" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AppStoreProvider>{children}</AppStoreProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
