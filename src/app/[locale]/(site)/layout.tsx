import { ContactWidget } from "@/components/site/ContactWidget";
import { Footer } from "@/components/site/Footer";
import { LiveBanner } from "@/components/site/LiveBanner";
import { SiteHeader } from "@/components/site/SiteHeader";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LiveBanner />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <Footer />
      <ContactWidget />
    </>
  );
}
