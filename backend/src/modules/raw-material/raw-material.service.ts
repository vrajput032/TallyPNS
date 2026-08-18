import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { activeOnly } from "../../lib/activeRecords.js";
import { piecesFromKg } from "../../lib/rawMaterialYield.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { paymentStatus } from "../payments/payment.utils.js";
import type {
  createRawMaterialBillSchema,
  createRawMaterialPaymentSchema,
} from "./raw-material.schema.js";

const billInclude = {
  items: true,
  payments: { orderBy: { paymentDate: "desc" as const } },
};

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function kg(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function withSummary<
  T extends {
    totalAmount: { toString(): string } | number | string;
    totalKg: { toString(): string } | number | string;
    payments?: { amount: unknown }[];
  },
>(bill: T) {
  const totalAmount = Number(bill.totalAmount);
  const paidAmount = (bill.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceAmount = Math.max(0, money(totalAmount - paidAmount));
  const totalKg = Number(bill.totalKg);
  return {
    ...bill,
    paidAmount,
    balanceAmount,
    paymentStatus: paymentStatus(totalAmount, paidAmount),
    yield: piecesFromKg(totalKg),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function mapItems(items: z.infer<typeof createRawMaterialBillSchema>["items"]) {
  return items.map((item) => {
    const quantityKg = kg(item.quantityKg);
    const ratePerKg = item.ratePerKg;
    const amount = money(item.amount != null && item.amount > 0 ? item.amount : quantityKg * ratePerKg);
    return {
      description: item.description.trim(),
      hsn: item.hsn?.trim() || null,
      quantityKg,
      ratePerKg,
      amount,
    };
  });
}

export async function listRawMaterialBills() {
  const bills = await prisma.rawMaterialBill.findMany({
    where: activeOnly,
    include: billInclude,
    orderBy: { billDate: "desc" },
  });
  return bills.map(withSummary);
}

export async function getRawMaterialBill(id: string) {
  const bill = await prisma.rawMaterialBill.findUnique({
    where: { id },
    include: billInclude,
  });
  if (!bill || bill.deletedAt) {
    throw new ApiError(404, "Raw material bill not found");
  }
  return withSummary(bill);
}

export async function createRawMaterialBill(data: z.infer<typeof createRawMaterialBillSchema>) {
  const items = mapItems(data.items);
  const totalKg = kg(items.reduce((sum, item) => sum + item.quantityKg, 0));

  try {
    const bill = await prisma.rawMaterialBill.create({
      data: {
        billNo: data.billNo.trim(),
        supplierName: data.supplierName.trim(),
        supplierGstin: data.supplierGstin?.trim() || null,
        billDate: data.billDate ?? new Date(),
        vehicleNo: data.vehicleNo?.trim() || null,
        destination: data.destination?.trim() || null,
        taxableAmount: money(data.taxableAmount),
        cgstAmount: money(data.cgstAmount ?? 0),
        sgstAmount: money(data.sgstAmount ?? 0),
        igstAmount: money(data.igstAmount ?? 0),
        roundOff: money(data.roundOff ?? 0),
        totalAmount: money(data.totalAmount),
        totalKg,
        notes: data.notes?.trim() || null,
        sourceFileName: data.sourceFileName?.trim() || null,
        items: { create: items },
      },
      include: billInclude,
    });
    return withSummary(bill);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, `Bill ${data.billNo.trim()} already exists`);
    }
    throw error;
  }
}

export async function updateRawMaterialBill(
  id: string,
  data: z.infer<typeof createRawMaterialBillSchema>
) {
  const existing = await getRawMaterialBill(id);
  if ((existing.payments?.length ?? 0) > 0) {
    throw new ApiError(400, "Cannot edit a bill that already has payments");
  }

  const items = mapItems(data.items);
  const totalKg = kg(items.reduce((sum, item) => sum + item.quantityKg, 0));

  try {
    const bill = await prisma.$transaction(async (tx) => {
      await tx.rawMaterialBillItem.deleteMany({ where: { billId: id } });
      return tx.rawMaterialBill.update({
        where: { id },
        data: {
          billNo: data.billNo.trim(),
          supplierName: data.supplierName.trim(),
          supplierGstin: data.supplierGstin?.trim() || null,
          billDate: data.billDate ?? existing.billDate,
          vehicleNo: data.vehicleNo?.trim() || null,
          destination: data.destination?.trim() || null,
          taxableAmount: money(data.taxableAmount),
          cgstAmount: money(data.cgstAmount ?? 0),
          sgstAmount: money(data.sgstAmount ?? 0),
          igstAmount: money(data.igstAmount ?? 0),
          roundOff: money(data.roundOff ?? 0),
          totalAmount: money(data.totalAmount),
          totalKg,
          notes: data.notes?.trim() || null,
          sourceFileName: data.sourceFileName?.trim() || existing.sourceFileName,
          items: { create: items },
        },
        include: billInclude,
      });
    });
    return withSummary(bill);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, `Bill ${data.billNo.trim()} already exists`);
    }
    throw error;
  }
}

export async function deleteRawMaterialBill(id: string) {
  const bill = await getRawMaterialBill(id);
  if ((bill.payments?.length ?? 0) > 0) {
    throw new ApiError(400, "Cannot delete bill with payments. Delete payments first.");
  }
  await prisma.rawMaterialBill.delete({ where: { id } });
}

const PAYMENT_PREFIX = "RMP-";
const PAYMENT_START = 10001;

async function nextPaymentNo() {
  const rows = await prisma.rawMaterialPayment.findMany({
    where: { paymentNo: { startsWith: PAYMENT_PREFIX } },
    select: { paymentNo: true },
  });
  const maxSeq = rows.reduce((max, { paymentNo }) => {
    const seq = Number(paymentNo.slice(PAYMENT_PREFIX.length));
    return Number.isFinite(seq) && seq > max ? seq : max;
  }, PAYMENT_START - 1);
  return `${PAYMENT_PREFIX}${maxSeq + 1}`;
}

export async function createRawMaterialPayment(
  billId: string,
  data: z.infer<typeof createRawMaterialPaymentSchema>
) {
  const bill = await getRawMaterialBill(billId);
  if (bill.paymentStatus === "PAID") {
    throw new ApiError(400, "Bill is already fully paid");
  }
  if (data.amount > bill.balanceAmount + 0.009) {
    throw new ApiError(400, `Amount exceeds balance due (₹${bill.balanceAmount.toFixed(2)})`);
  }

  const paymentNo = await nextPaymentNo();
  await prisma.rawMaterialPayment.create({
    data: {
      paymentNo,
      billId,
      amount: money(data.amount),
      mode: data.mode,
      reference: data.reference?.trim() || null,
      paymentDate: data.paymentDate ?? new Date(),
      narration: data.narration?.trim() || null,
    },
  });
  return getRawMaterialBill(billId);
}

export async function deleteRawMaterialPayment(paymentId: string) {
  const payment = await prisma.rawMaterialPayment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new ApiError(404, "Payment not found");
  const bill = await prisma.rawMaterialBill.findUnique({ where: { id: payment.billId } });
  if (bill?.deletedAt) throw new ApiError(400, "Cannot change payments on a deleted bill");
  await prisma.rawMaterialPayment.delete({ where: { id: paymentId } });
  return getRawMaterialBill(payment.billId);
}
