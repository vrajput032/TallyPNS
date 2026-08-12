/** Prisma filter for records that are not in the recycle bin. */
export const activeOnly = { deletedAt: null } as const;

/** Prisma filter for soft-deleted records in the recycle bin. */
export const deletedOnly = { deletedAt: { not: null } } as const;
