import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import { Scene } from "@/components/shell/Scene";
import { DrawerProvider } from "@/components/ui/Drawer";
import { ToastProvider } from "@/components/ui/Toast";
import { AppStateProvider } from "@/state/AppState";
import "@/styles/tokens.css";
import "@/styles/globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});

const jetBrainsMono = JetBrains_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "No One Alone Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${beVietnamPro.variable} ${jetBrainsMono.variable}`}>
      <body>
        <Scene />
        <div className="flash" id="flash"></div>
        <AppStateProvider>
          <ToastProvider>
            <DrawerProvider>
              <div className="wrap">
                <AppShell>{children}</AppShell>
              </div>
            </DrawerProvider>
          </ToastProvider>
        </AppStateProvider>
      </body>
    </html>
  );
}
