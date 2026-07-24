import { COMPANY } from "@/config/company";
import { amountToIndianWords } from "@/lib/numberToWords";
import type { PurchaseBill } from "./types";

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
  const totalQty = bill.items.reduce((sum, item) => sum + Number(item.quantity), 0);

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
    <div className="mx-auto min-w-[640px] max-w-3xl border border-black bg-white p-0 text-black sm:min-w-0 print:min-w-0 print:border-0">
      <div className="grid grid-cols-2 border-b border-black">
        <div className="border-r border-black p-3">
          <p className="text-sm font-semibold">GSTIN: {bill.vendor.gstin ?? "-"}</p>
          <h1 className="text-xl font-bold">{bill.vendor.name}</h1>
          {bill.vendor.address && <p className="text-xs leading-tight">{bill.vendor.address}</p>}
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
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-b border-black p-3">
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

      <table className="w-full border-b border-black text-xs">
        <thead>
          <tr className="border-b border-black bg-neutral-100">
            <th className="border-r border-black p-1.5 text-left">S.N</th>
            <th className="border-r border-black p-1.5 text-left">Description of Goods</th>
            <th className="border-r border-black p-1.5 text-left">HSN/SAC</th>
            <th className="border-r border-black p-1.5 text-right">Qty.</th>
            <th className="border-r border-black p-1.5 text-left">Unit</th>
            <th className="border-r border-black p-1.5 text-right">Price</th>
            <th className="p-1.5 text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, index) => (
            <tr key={item.id} className="border-b border-black/20">
              <td className="border-r border-black p-1.5">{index + 1}.</td>
              <td className="border-r border-black p-1.5 font-medium">{item.product.name}</td>
              <td className="border-r border-black p-1.5">{item.product.hsn ?? "-"}</td>
              <td className="border-r border-black p-1.5 text-right">
                {Number(item.quantity).toFixed(2)}
              </td>
              <td className="border-r border-black p-1.5">{item.product.unit}</td>
              <td className="border-r border-black p-1.5 text-right">
                {Number(item.rate).toFixed(2)}
              </td>
              <td className="p-1.5 text-right">
                {(Number(item.quantity) * Number(item.rate)).toFixed(2)}
              </td>
            </tr>
          ))}
          {[...gstGroups.entries()].map(([rate, group]) => (
            <tr key={rate}>
              <td colSpan={6} className="border-r border-black p-1.5 text-right">
                Add : CGST @ {(rate / 2).toFixed(2)}%
              </td>
              <td className="p-1.5 text-right">{(group.tax / 2).toFixed(2)}</td>
            </tr>
          ))}
          {[...gstGroups.entries()].map(([rate, group]) => (
            <tr key={`sgst-${rate}`}>
              <td colSpan={6} className="border-r border-black p-1.5 text-right">
                Add : SGST @ {(rate / 2).toFixed(2)}%
              </td>
              <td className="p-1.5 text-right">{(group.tax / 2).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-black font-bold">
            <td colSpan={3} className="border-r border-black p-1.5">
              Grand Total
            </td>
            <td className="border-r border-black p-1.5 text-right">{totalQty.toFixed(2)}</td>
            <td className="border-r border-black p-1.5" colSpan={2} />
            <td className="p-1.5 text-right">{grandTotal.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <table className="w-full border-b border-black text-xs">
        <thead>
          <tr className="border-b border-black bg-neutral-100">
            <th className="border-r border-black p-1.5 text-left">HSN/SAC</th>
            <th className="border-r border-black p-1.5 text-left">Tax Rate</th>
            <th className="border-r border-black p-1.5 text-right">Taxable Amt.</th>
            <th className="border-r border-black p-1.5 text-right">CGST Amt.</th>
            <th className="border-r border-black p-1.5 text-right">SGST Amt.</th>
            <th className="p-1.5 text-right">Total Tax</th>
          </tr>
        </thead>
        <tbody>
          {[...gstGroups.entries()].map(([rate, group]) => (
            <tr key={rate}>
              <td className="border-r border-black p-1.5">
                {bill.items.find((i) => Number(i.gstRate) === rate)?.product.hsn ?? "-"}
              </td>
              <td className="border-r border-black p-1.5">{rate}%</td>
              <td className="border-r border-black p-1.5 text-right">{group.taxable.toFixed(2)}</td>
              <td className="border-r border-black p-1.5 text-right">{(group.tax / 2).toFixed(2)}</td>
              <td className="border-r border-black p-1.5 text-right">{(group.tax / 2).toFixed(2)}</td>
              <td className="p-1.5 text-right">{group.tax.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="p-2 text-xs font-semibold">
        Rupees {amountToIndianWords(grandTotal)} Only
      </div>
    </div>
    </div>
  );
}
