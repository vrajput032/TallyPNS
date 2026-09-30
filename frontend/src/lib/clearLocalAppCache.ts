/** Drops cached ERP lists/reports from this browser (call on logout). */
export async function clearLocalAppCache(): Promise<void> {
  const { persistor } = await import("@/store/store");
  await persistor.purge();
}
