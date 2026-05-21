import ProfitLossStatement from "./ProfitLossStatement";

export const metadata = {
  title: "Profit & Loss | SaaS Platform",
  description: "View your business profit and loss statement.",
};

export default function ProfitLossPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <ProfitLossStatement />
      </div>
    </div>
  );
}
