import { COMPANY } from "@/config/company";
import { amountToIndianWords } from "@/lib/numberToWords";
import { formatInr } from "@/lib/formatInr";
import type { PurchaseBill } from "./types";

const KG_PER_TON = 1000;

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString("en-GB").split("/").join("-");
}

export function PurchaseBillPrint({ bill }: { bill: PurchaseBill }) {
  const taxableTotal = bill.items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.rate),
    0
  );

  const gstGroups = new Map<number, { taxable: number; tax: number }>();
  for (const item of bill.items) {
    const rate = Number(item.gstRate);
    const taxable = Number(item.quantity) * Number(item.rate);
    const tax = (taxable * rate) / 100;
    const existing = gstGroups.get(rate) ?? { taxable: 0, tax: 0 };
    gstGroups.set(rate, { taxable: existing.taxable + taxable, tax: existing.tax + tax });
  }

  const totalTax = [...gstGroups.values()].reduce((sum, g) => sum + g.tax, 0);
  const grandTotal = taxableTotal + totalTax;
  const totalTons = bill.items.reduce((sum, item) => sum + Number(item.quantity), 0);

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
      <div className="mx-auto min-w-[640px] max-w-3xl border-[2.5px] border-black bg-white p-0 text-black sm:min-w-0 print:min-w-0">
        <div className="grid grid-cols-2 border-b-2 border-black">
          <div className="border-r-2 border-black p-3">
            <p className="text-sm font-semibold">GSTIN: {bill.vendor.gstin ?? "-"}</p>
            <h1 className="text-xl font-bold">{bill.vendor.name}</h1>
            {bill.vendor.address && (
              <p className="text-xs leading-tight">{bill.vendor.address}</p>
            )}
          </div>
          <div className="p-3">
            <h2 className="text-center text-lg font-bold underline">PURCHASE BILL</h2>
            <table className="mt-2 w-full text-xs">
              <tbody>
                <tr>
                  <td className="py-0.5 font-semibold">Bill No.</td>
                  <td className="py-0.5">: {bill.billNo}</td>
                </tr>
                <tr>
                  <td className="py-0.5 font-semibold">Date of Bill</td>
                  <td className="py-0.5">: {formatDate(bill.billDate)}</td>
                </tr>
                {bill.transport?.trim() && (
                  <tr>
                    <td className="py-0.5 font-semibold">Transport</td>
                    <td className="py-0.5">: {bill.transport}</td>
                  </tr>
                )}
                {bill.vehicleNo?.trim() && (
                  <tr>
                    <td className="py-0.5 font-semibold">Vehicle No.</td>
                    <td className="py-0.5">: {bill.vehicleNo}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-b-2 border-black p-3">
          <p className="text-xs font-semibold underline">Billed to:</p>
          <p className="text-sm font-bold">{COMPANY.name}</p>
          <p className="text-xs leading-tight">
            {COMPANY.address.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
          <p className="text-xs font-semibold">GSTIN/UIN: {COMPANY.gstin}</p>
        </div>

        <table className="w-full border-b-2 border-black text-xs">
          <thead>
            <tr className="border-b-2 border-black bg-[#e5e5e5]">
              <th className="border-r border-black p-1.5 text-center">S.N</th>
              <th className="border-r border-black p-1.5 text-center">Description</th>
              <th className="border-r border-black p-1.5 text-center">HSN</th>
              <th className="border-r border-black p-1.5 text-center">Qty (Tons)</th>
              <th className="border-r border-black p-1.5 text-center">Price/Kg (₹)</th>
              <th className="border-r border-black p-1.5 text-center">Rate/Ton (₹)</th>
              <th className="p-1.5 text-center">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, index) => {
              const tons = Number(item.quantity);
              const pricePerKg =
                item.pricePerKg != null && Number(item.pricePerKg) > 0
                  ? Number(item.pricePerKg)
                  : Number(item.rate) / KG_PER_TON;
              return (
                <tr key={item.id} className="border-b border-black/20">
                  <td className="border-r border-black p-1.5">{index + 1}.</td>
                  <td className="border-r border-black p-1.5 font-medium">
                    {item.product.name.replace(/\s*\d+\s*mm\b/gi, "").trim() || item.product.name}
                  </td>
                  <td className="border-r border-black p-1.5">{item.product.hsn ?? "-"}</td>
                  <td className="border-r border-black p-1.5 text-right">
                    {formatInr(tons, 3)}
                    <span className="block text-[10px] text-neutral-600">
                      {(tons * KG_PER_TON).toFixed(0)} Kg
                    </span>
                  </td>
                  <td className="border-r border-black p-1.5 text-right">
                    {formatInr(pricePerKg)}
                  </td>
                  <td className="border-r border-black p-1.5 text-right">
                    {formatInr(Number(item.rate))}
                  </td>
                  <td className="p-1.5 text-right">
                    {formatInr(Number(item.quantity) * Number(item.rate))}
                  </td>
                </tr>
              );
            })}
            {[...gstGroups.entries()].map(([rate, group]) => (
              <tr key={rate}>
                <td colSpan={6} className="border-r border-black p-1.5 text-right">
                  Add : CGST @ {(rate / 2).toFixed(2)}%
                </td>
                <td className="p-1.5 text-right">{formatInr(group.tax / 2)}</td>
              </tr>
            ))}
            {[...gstGroups.entries()].map(([rate, group]) => (
              <tr key={`sgst-${rate}`}>
                <td colSpan={6} className="border-r border-black p-1.5 text-right">
                  Add : SGST @ {(rate / 2).toFixed(2)}%
                </td>
                <td className="p-1.5 text-right">{formatInr(group.tax / 2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-bold">
              <td colSpan={3} className="border-r border-black p-1.5">
                Grand Total
              </td>
              <td className="border-r border-black p-1.5 text-right">
                {formatInr(totalTons, 3)}
                <span className="block text-[10px] font-normal">Tons</span>
              </td>
              <td className="border-r border-black p-1.5" colSpan={2} />
              <td className="p-1.5 text-right">₹{formatInr(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="p-2 text-xs font-semibold">
          Rupees {amountToIndianWords(grandTotal)} Only
        </div>
      </div>
    </div>
  );
}
