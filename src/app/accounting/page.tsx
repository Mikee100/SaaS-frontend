import { redirect } from "next/navigation";

export const metadata = {
  title: "Accounting Center | SaaS Platform",
  description: "Manage your business ledgers, trial balances, and financial reports.",
};

export default function AccountingPage() {
  redirect('/accounts/ledgers');
}
