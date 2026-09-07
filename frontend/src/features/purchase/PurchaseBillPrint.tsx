import { COMPANY } from "@/config/company";
import { amountToIndianWords } from "@/lib/numberToWords";
import { formatInr } from "@/lib/formatInr";
import type { PurchaseBill } from "./types";
import { purchaseLineLabel } from "./types";

const KG_PER_TON = 1000;

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString("en-GB").split("/").join("-");
}

export function PurchaseBillPrint({ bill }: { bill: PurchaseBill }) {
  const isEquipment = bill.kind === "EQUIPMENT";
  const taxableTotal = bill.items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.rate),
    0
  );

  const gstGroups = new Map<number, { taxable: number; tax: number }>();
  for (const item of bill.items) {
    const rate = Number(item.gstRate);
    if (rate <= 0) continue;
    const taxable = Number(item.quantity) * Number(item.rate);
    const tax = (taxable * rate) / 100;
    const existing = gstGroups.get(rate) ?? { taxable: 0, tax: 0 };
    gstGroups.set(rate, { taxable: existing.taxable + taxable, tax: existing.tax + tax });
  }

  const totalTax = [...gstGroups.values()].reduce((sum, g) => sum + g.tax, 0);
  const grandTotal = taxableTotal + totalTax;
  const totalQty = bill.items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const sellerName = bill.vendor?.name ?? "Equipment purchase";
  const sellerGstin = bill.supplierGstin ?? bill.vendor?.gstin ?? "-";
  const sellerAddress = bill.vendor?.address ?? null;

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
      <div className="mx-auto min-w-[640px] max-w-3xl border-[2.5px] border-black bg-white p-0 text-black sm:min-w-0 print:min-w-0">
        <div className="grid grid-cols-2 border-b-2 border-black">
          <div className="border-r-2 border-black p-3">
            {bill.vendor || bill.supplierGstin ? (
              <>
                <p className="text-sm font-semibold">GSTIN: {sellerGstin}</p>
                {bill.vendor ? (
                  <>
                    <h1 className="text-xl font-bold">{sellerName}</h1>
                    {sellerAddress ? <p className="text-xs leading-tight">{sellerAddress}</p> : null}
                  </>
                ) : (
                  <h1 className="text-xl font-bold">Equipment purchase</h1>
                )}
              </>
            ) : (
              <>
                <h1 className="text-xl font-bold">{COMPANY.name}</h1>
                <p className="text-xs leading-tight">Equipment purchase record</p>
              </>
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
                {bill.title?.trim() ? (
                  <tr>
                    <td className="py-0.5 font-semibold">Title</td>
                    <td className="py-0.5">: {bill.title}</td>
                  </tr>
                ) : null}
                <tr>
                  <td className="py-0.5 font-semibold">Date of Bill</td>
                  <td className="py-0.5">: {formatDate(bill.billDate)}</td>
                </tr>
                {bill.supplierInvoiceNo?.trim() ? (
                  <tr>
                    <td className="py-0.5 font-semibold">Invoice No.</td>
                    <td className="py-0.5">: {bill.supplierInvoiceNo}</td>
                  </tr>
                ) : null}
                {bill.transport?.trim() ? (
                  <tr>
                    <td className="py-0.5 font-semibold">Transport</td>
                    <td className="py-0.5">: {bill.transport}</td>
                  </tr>
                ) : null}
                {bill.vehicleNo?.trim() ? (
                  <tr>
                    <td className="py-0.5 font-semibold">Vehicle No.</td>
                    <td className="py-0.5">: {bill.vehicleNo}</td>
                  </tr>
                ) : null}
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
          {bill.notes?.trim() ? (
            <p className="mt-2 whitespace-pre-wrap text-xs">{bill.notes}</p>
          ) : null}
        </div>

        <table className="w-full border-b-2 border-black text-xs">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="border-r border-black p-1.5 text-center">S.N</th>
              <th className="border-r border-black p-1.5 text-center">Description</th>
              {!isEquipment ? <th className="border-r border-black p-1.5 text-center">HSN</th> : null}
              <th className="border-r border-black p-1.5 text-center">
                {isEquipment ? "Qty" : "Qty (Tons)"}
              </th>
              {!isEquipment ? (
                <>
                  <th className="border-r border-black p-1.5 text-center">Price/Kg (₹)</th>
                  <th className="border-r border-black p-1.5 text-center">Rate/Ton (₹)</th>
                </>
              ) : (
                <th className="border-r border-black p-1.5 text-center">Rate (₹)</th>
              )}
              <th className="p-1.5 text-center">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, index) => {
              const qty = Number(item.quantity);
              const pricePerKg =
                item.pricePerKg != null && Number(item.pricePerKg) > 0
                  ? Number(item.pricePerKg)
                  : Number(item.rate) / KG_PER_TON;
              return (
                <tr key={item.id} className="border-b border-black/20">
                  <td className="border-r border-black p-1.5">{index + 1}.</td>
                  <td className="border-r border-black p-1.5 font-medium">
                    {purchaseLineLabel(item)}
                  </td>
                  {!isEquipment ? (
                    <td className="border-r border-black p-1.5">{item.product?.hsn ?? "-"}</td>
                  ) : null}
                  <td className="border-r border-black p-1.5 text-right">
                    {formatInr(qty, isEquipment ? 0 : 3)}
                    {!isEquipment ? (
                      <span className="block text-[10px] text-neutral-600">
                        {(qty * KG_PER_TON).toFixed(0)} Kg
                      </span>
                    ) : null}
                  </td>
                  {!isEquipment ? (
                    <>
                      <td className="border-r border-black p-1.5 text-right">
                        {formatInr(pricePerKg)}
                      </td>
                      <td className="border-r border-black p-1.5 text-right">
                        {formatInr(Number(item.rate))}
                      </td>
                    </>
                  ) : (
                    <td className="border-r border-black p-1.5 text-right">
                      {formatInr(Number(item.rate))}
                    </td>
                  )}
                  <td className="p-1.5 text-right">
                    {formatInr(Number(item.quantity) * Number(item.rate))}
                  </td>
                </tr>
              );
            })}
            {[...gstGroups.entries()].map(([rate, group]) => (
              <tr key={rate}>
                <td
                  colSpan={isEquipment ? 4 : 6}
                  className="border-r border-black p-1.5 text-right"
                >
                  Add : CGST @ {(rate / 2).toFixed(2)}%
                </td>
                <td className="p-1.5 text-right">{formatInr(group.tax / 2)}</td>
              </tr>
            ))}
            {[...gstGroups.entries()].map(([rate, group]) => (
              <tr key={`sgst-${rate}`}>
                <td
                  colSpan={isEquipment ? 4 : 6}
                  className="border-r border-black p-1.5 text-right"
                >
                  Add : SGST @ {(rate / 2).toFixed(2)}%
                </td>
                <td className="p-1.5 text-right">{formatInr(group.tax / 2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-bold">
              <td colSpan={isEquipment ? 2 : 3} className="border-r border-black p-1.5">
                Grand Total
              </td>
              <td className="border-r border-black p-1.5 text-right">
                {formatInr(totalQty, isEquipment ? 0 : 3)}
                {!isEquipment ? <span className="block text-[10px] font-normal">Tons</span> : null}
              </td>
              <td className="border-r border-black p-1.5" colSpan={isEquipment ? 1 : 2} />
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
