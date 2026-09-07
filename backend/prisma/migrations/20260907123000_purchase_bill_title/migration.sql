ALTER TABLE "PurchaseBill" ADD COLUMN "title" TEXT;

UPDATE "PurchaseBill" AS pb
SET "title" = left(trim(sub.d), 120)
FROM (
  SELECT DISTINCT ON ("purchaseBillId")
    "purchaseBillId",
    "description" AS d
  FROM "PurchaseBillItem"
  WHERE "description" IS NOT NULL AND btrim("description") <> ''
  ORDER BY "purchaseBillId", "id"
) AS sub
WHERE pb.id = sub."purchaseBillId"
  AND (pb."title" IS NULL OR btrim(pb."title") = '');
