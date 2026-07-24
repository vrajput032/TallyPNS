import { CashBankBookPage } from "@/features/payments/CashBankBookPage";
import { useCashBook } from "@/features/payments/usePayments";

export function CashPage() {
  const { data, isLoading } = useCashBook();
  return <CashBankBookPage title="Cash Book" data={data} isLoading={isLoading} />;
}
