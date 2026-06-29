import BuyerDashboardLayout from "./components/BuyerDashboardLayout";

export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BuyerDashboardLayout>{children}</BuyerDashboardLayout>;
}
