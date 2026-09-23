import DashboardHeader from "@/app/components/ui/DashboardHeader";
import QuickActions from "@/app/components/ui/QuickActions";
import RecentActivity from "@/app/components/ui/RecentActivity";

export default function DashboardPage() {
  return (
    <>
      <DashboardHeader />
      <QuickActions />
      <RecentActivity />
    </>
  );
}
