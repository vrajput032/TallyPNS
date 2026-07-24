import { CashBankBookPage } from "@/features/payments/CashBankBookPage";
import { useBankBook } from "@/features/payments/usePayments";

export function BankPage() {
  const { data, isLoading } = useBankBook();
  return <CashBankBookPage title="Bank Book" data={data} isLoading={isLoading} />;
}
