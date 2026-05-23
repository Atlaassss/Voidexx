import { Sidebar } from "@/components/dash/Sidebar";
import { MobileNav } from "@/components/dash/MobileNav";
import { HelpWidget } from "@/components/dash/HelpWidget";
import { OnboardingTour } from "@/components/dash/OnboardingTour";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-void-0">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
        <div className="absolute inset-0 -z-0 bg-grid-fine opacity-30" aria-hidden />
        <div className="relative z-10 flex flex-1 flex-col">{children}</div>
      </div>
      <MobileNav />
      <OnboardingTour />
      <HelpWidget />
    </div>
  );
}
