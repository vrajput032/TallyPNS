import { COMPANY } from "@/config/company";
import { amountToIndianWords } from "@/lib/numberToWords";
import { formatInr } from "@/lib/formatInr";
import type { SalesInvoice } from "./types";

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString("en-GB").split("/").join("-");
}

const GST_STATE_NAMES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "27": "Maharashtra",
  "29": "Karnataka",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "36": "Telangana",
  "37": "Andhra Pradesh",
};

function placeOfSupply(gstin: string | null | undefined) {
  const code = gstin?.slice(0, 2) || COMPANY.stateCode;
  const name = GST_STATE_NAMES[code] ?? COMPANY.stateName;
  return `${name} (${code})`;
}

/** Shared column widths so vertical rules stay aligned across the sheet */
const COLS = {
  sn: "6%",
  desc: "34%",
  hsn: "12%",
  qty: "16%",
  price: "14%",
  amount: "18%",
} as const;

export function SalesInvoicePrint({ invoice }: { invoice: SalesInvoice }) {
  const taxableTotal = invoice.items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.rate),
    0
  );

  const gstGroups = new Map<number, { taxable: number; tax: number; hsn: string }>();
  for (const item of invoice.items) {
    const rate = Number(item.gstRate);
    const taxable = Number(item.quantity) * Number(item.rate);
    const tax = (taxable * rate) / 100;
    const existing = gstGroups.get(rate) ?? {
      taxable: 0,
      tax: 0,
      hsn: item.product.hsn ?? "-",
    };
    gstGroups.set(rate, {
      taxable: existing.taxable + taxable,
      tax: existing.tax + tax,
      hsn: existing.hsn,
    });
  }

  const totalTax = [...gstGroups.values()].reduce((sum, g) => sum + g.tax, 0);
  const grandTotal = taxableTotal + totalTax;
  const totalQty = invoice.items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const primaryUnit = invoice.items[0]?.product.unit ?? "Pcs.";
  const supplyCode = invoice.customer.gstin?.slice(0, 2) || COMPANY.stateCode;
  const isIntraState = supplyCode === COMPANY.stateCode;

  const bankConfigured = Boolean(COMPANY.bank.accountNo || COMPANY.bank.ifsc);
  const contactLine = COMPANY.contacts.map((c) => `${c.name}: ${c.phone}`).join("  |  ");

  return (
    <div className="invoice-print-scroll -mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0 print:mx-0 print:overflow-visible print:px-0 print:pb-0">
      <div className="invoice-sheet mx-auto flex w-[210mm] min-h-0 flex-col border-[2.5px] border-black bg-white text-black print:mx-auto print:w-[190mm]">
        {/* Header — grey fills, centered titles */}
        <div className="invoice-header border-b-2 border-black">
          <div className="border-b border-black bg-[#4b5563] px-3 py-1.5 text-center print:bg-[#4b5563]">
            <p className="text-[11px] font-bold tracking-[0.28em] text-white print:text-white">
              TAX INVOICE
            </p>
          </div>
          <div className="bg-[#e5e5e5] px-3 pb-2.5 pt-2.5 text-center print:bg-[#e5e5e5]">
            <h1 className="text-[22px] font-bold tracking-[0.08em]">{COMPANY.name}</h1>
            <p className="mt-1.5 text-[11px] font-semibold">GSTIN: {COMPANY.gstin}</p>
            <p className="mt-1 text-[10px] leading-snug">
              {COMPANY.address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            <p className="mt-1.5 text-[10px]">{contactLine}</p>
          </div>
        </div>

        <div className="border-b-2 border-black px-3 py-2">
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              <tr>
                <td className="w-1/2 py-0.5 pr-2 align-top">
                  <span className="font-semibold">Invoice No.</span> : {invoice.invoiceNo}
                </td>
                <td className="w-1/2 py-0.5 pl-2 align-top">
                  <span className="font-semibold">Date of Invoice</span> :{" "}
                  {formatDate(invoice.invoiceDate)}
                </td>
              </tr>
              <tr>
                <td className="py-0.5 pr-2 align-top">
                  <span className="font-semibold">Place of Supply</span> :{" "}
                  {placeOfSupply(invoice.customer.gstin)}
                </td>
                <td className="py-0.5 pl-2 align-top">
                  <span className="font-semibold">Reverse Charge</span> : N
                </td>
              </tr>
              <tr>
                <td className="py-0.5 pr-2 align-top">
                  <span className="font-semibold">Transport</span> :{" "}
                  {invoice.transport?.trim() || "-"}
                </td>
                <td className="py-0.5 pl-2 align-top">
                  <span className="font-semibold">Vehicle No.</span> :{" "}
                  {invoice.vehicleNo?.trim() || "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 border-b-2 border-black">
          <div className="border-r-2 border-black p-3">
            <p className="text-[11px] font-semibold underline">Billed to:</p>
            <p className="mt-1 text-sm font-bold">{invoice.customer.name}</p>
            {invoice.customer.address && (
              <p className="mt-0.5 whitespace-pre-line text-[11px] leading-snug">
                {invoice.customer.address}
              </p>
            )}
            {invoice.customer.gstin && (
              <p className="mt-1 text-[11px] font-semibold">
                GSTIN/UIN: {invoice.customer.gstin}
              </p>
            )}
          </div>
          <div className="p-3">
            <p className="text-[11px] font-semibold underline">Shipped to:</p>
            <p className="mt-1 text-sm font-bold">{invoice.customer.name}</p>
            {invoice.customer.address && (
              <p className="mt-0.5 whitespace-pre-line text-[11px] leading-snug">
                {invoice.customer.address}
              </p>
            )}
            {invoice.customer.gstin && (
              <p className="mt-1 text-[11px] font-semibold">
                GSTIN/UIN: {invoice.customer.gstin}
              </p>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="invoice-items-wrap flex min-h-0 flex-col">
          <table
            className="invoice-items-table w-full border-collapse text-[11px]"
            style={{ tableLayout: "fixed" }}
          >
            <colgroup>
              <col style={{ width: COLS.sn }} />
              <col style={{ width: COLS.desc }} />
              <col style={{ width: COLS.hsn }} />
              <col style={{ width: COLS.qty }} />
              <col style={{ width: COLS.price }} />
              <col style={{ width: COLS.amount }} />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-black bg-[#e5e5e5] print:bg-[#e5e5e5]">
                <th className="border-r border-black px-1.5 py-1.5 text-center font-semibold">S.N</th>
                <th className="border-r border-black px-1.5 py-1.5 text-center font-semibold">
                  Description of Goods
                </th>
                <th className="border-r border-black px-1.5 py-1.5 text-center font-semibold">
                  HSN/SAC
                </th>
                <th className="border-r border-black px-1.5 py-1.5 text-center font-semibold">Qty.</th>
                <th className="border-r border-black px-1.5 py-1.5 text-center font-semibold">
                  Unit Price (₹)
                </th>
                <th className="px-1.5 py-1.5 text-center font-semibold">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={item.id} className="align-top">
                  <td className="border-r border-black px-1.5 py-1">{index + 1}.</td>
                  <td className="border-r border-black px-1.5 py-1 font-medium">
                    {item.product.name}
                    {item.sizeMm != null && Number(item.sizeMm) > 0
                      ? ` ${Number(item.sizeMm)}mm`
                      : ""}
                  </td>
                  <td className="border-r border-black px-1.5 py-1">{item.product.hsn ?? "-"}</td>
                  <td className="border-r border-black px-1.5 py-1 text-right">
                    {formatInr(Number(item.quantity))} {item.product.unit}
                  </td>
                  <td className="border-r border-black px-1.5 py-1 text-right">
                    {formatInr(Number(item.rate))}
                  </td>
                  <td className="px-1.5 py-1 text-right">
                    {formatInr(Number(item.quantity) * Number(item.rate))}
                  </td>
                </tr>
              ))}

              <tr className="invoice-items-spacer h-10 print:h-8">
                <td className="border-r border-black p-0">&nbsp;</td>
                <td className="border-r border-black p-0" />
                <td className="border-r border-black p-0" />
                <td className="border-r border-black p-0" />
                <td className="border-r border-black p-0" />
                <td className="p-0" />
              </tr>

              {isIntraState
                ? [...gstGroups.entries()].flatMap(([rate, group]) => [
                    <tr key={`cgst-${rate}`}>
                      <td className="border-r border-black px-1.5 py-1" colSpan={3} />
                      <td className="border-r border-black px-1.5 py-1 text-right" colSpan={2}>
                        Add : CGST @ {(rate / 2).toFixed(2)}%
                      </td>
                      <td className="px-1.5 py-1 text-right">{formatInr(group.tax / 2)}</td>
                    </tr>,
                    <tr key={`sgst-${rate}`}>
                      <td className="border-r border-black px-1.5 py-1" colSpan={3} />
                      <td className="border-r border-black px-1.5 py-1 text-right" colSpan={2}>
                        Add : SGST @ {(rate / 2).toFixed(2)}%
                      </td>
                      <td className="px-1.5 py-1 text-right">{formatInr(group.tax / 2)}</td>
                    </tr>,
                  ])
                : [...gstGroups.entries()].map(([rate, group]) => (
                    <tr key={`igst-${rate}`}>
                      <td className="border-r border-black px-1.5 py-1" colSpan={3} />
                      <td className="border-r border-black px-1.5 py-1 text-right" colSpan={2}>
                        Add : IGST @ {rate.toFixed(2)}%
                      </td>
                      <td className="px-1.5 py-1 text-right">{formatInr(group.tax)}</td>
                    </tr>
                  ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-bold">
                <td className="border-r border-black px-1.5 py-1.5" colSpan={3}>
                  Grand Total
                </td>
                <td className="border-r border-black px-1.5 py-1.5 text-right">
                  {formatInr(totalQty)}
                  <span className="block text-[10px] font-normal">{primaryUnit}</span>
                </td>
                <td className="border-r border-black px-1.5 py-1.5" />
                <td className="px-1.5 py-1.5 text-right">₹{formatInr(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* HSN tax summary */}
        <table
          className="w-full border-collapse border-t-2 border-black text-[11px]"
          style={{ tableLayout: "fixed" }}
        >
          <thead>
            <tr className="border-b border-black bg-[#e5e5e5] print:bg-[#e5e5e5]">
              <th className="border-r border-black px-1.5 py-1.5 text-center font-semibold">
                HSN/SAC
              </th>
              <th className="border-r border-black px-1.5 py-1.5 text-center font-semibold">
                Tax Rate
              </th>
              <th className="border-r border-black px-1.5 py-1.5 text-center font-semibold">
                Taxable Amt. (₹)
              </th>
              {isIntraState ? (
                <>
                  <th className="border-r border-black px-1.5 py-1.5 text-center font-semibold">
                    CGST Amt. (₹)
                  </th>
                  <th className="border-r border-black px-1.5 py-1.5 text-center font-semibold">
                    SGST Amt. (₹)
                  </th>
                </>
              ) : (
                <th className="border-r border-black px-1.5 py-1.5 text-center font-semibold">
                  IGST Amt. (₹)
                </th>
              )}
              <th className="px-1.5 py-1.5 text-center font-semibold">Total Tax (₹)</th>
            </tr>
          </thead>
          <tbody>
            {[...gstGroups.entries()].map(([rate, group]) => {
              const half = group.tax / 2;
              return (
                <tr key={rate} className="border-b border-black">
                  <td className="border-r border-black px-1.5 py-1">{group.hsn}</td>
                  <td className="border-r border-black px-1.5 py-1">{rate}%</td>
                  <td className="border-r border-black px-1.5 py-1 text-right">
                    {formatInr(group.taxable)}
                  </td>
                  {isIntraState ? (
                    <>
                      <td className="border-r border-black px-1.5 py-1 text-right">
                        {formatInr(half)}
                      </td>
                      <td className="border-r border-black px-1.5 py-1 text-right">
                        {formatInr(half)}
                      </td>
                      <td className="px-1.5 py-1 text-right">
                        {formatInr(half)} + {formatInr(half)} = {formatInr(group.tax)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border-r border-black px-1.5 py-1 text-right">
                        {formatInr(group.tax)}
                      </td>
                      <td className="px-1.5 py-1 text-right">{formatInr(group.tax)}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="border-t-2 border-black px-3 py-2 text-[11px] font-semibold">
          Amount in Words: Rupees {amountToIndianWords(grandTotal)} Only
        </div>

        {/* Bank + terms + signatures */}
        <div className="grid grid-cols-2 border-t-2 border-black text-[11px]">
          <div className="border-r-2 border-black p-3">
            {bankConfigured && (
              <div className="mb-3">
                <p className="font-semibold">Bank Details:</p>
                <p>A/C NAME: {COMPANY.bank.accountName}</p>
                {COMPANY.bank.accountNo && <p>BANK A/C: {COMPANY.bank.accountNo}</p>}
                {COMPANY.bank.ifsc && <p>IFSC: {COMPANY.bank.ifsc}</p>}
              </div>
            )}
            <p className="font-semibold">Terms &amp; Conditions:</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4 leading-snug">
              <li>Goods once sold will not be taken back.</li>
              <li>
                Interest @ 18% p.a. will be charged if payment is not made within stipulated time.
              </li>
              <li>Subject to &apos;Haryana&apos; Jurisdiction only.</li>
            </ol>
            <p className="mt-10 border-t border-dashed border-black pt-1 font-medium">
              Receiver&apos;s Signature
            </p>
          </div>
          <div className="flex flex-col justify-between p-3">
            <p className="text-right font-semibold">for {COMPANY.name}</p>
            <p className="mt-16 border-t border-dashed border-black pt-1 text-right">
              Authorised Signatory
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
