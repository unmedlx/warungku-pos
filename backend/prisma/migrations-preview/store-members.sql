-- Multi-user cloud: keanggotaan toko, undangan, dan batas anggota per paket.
-- Jalankan sekali, lalu `npm run db:backfill-members` untuk mengisi baris OWNER
-- bagi toko yang sudah ada. Sebelum backfill selesai, tidak ada satu pun toko
-- yang punya anggota — jadi jangan deploy kode barunya sebelum skrip itu jalan.

CREATE TYPE "StoreRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF');

ALTER TABLE "plans" ADD COLUMN "max_members" INTEGER;

CREATE TABLE "store_members" (
    "id"          TEXT NOT NULL,
    "store_id"    TEXT NOT NULL,
    "user_id"     TEXT NOT NULL,
    "role"        "StoreRole" NOT NULL DEFAULT 'STAFF',
    "permissions" JSONB,
    "invited_by"  TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "store_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_members_store_id_user_id_key" ON "store_members"("store_id", "user_id");
CREATE INDEX "store_members_user_id_idx" ON "store_members"("user_id");

ALTER TABLE "store_members" ADD CONSTRAINT "store_members_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_members" ADD CONSTRAINT "store_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "store_invites" (
    "id"          TEXT NOT NULL,
    "store_id"    TEXT NOT NULL,
    "email"       TEXT NOT NULL,
    "role"        "StoreRole" NOT NULL DEFAULT 'STAFF',
    "permissions" JSONB,
    "code"        TEXT NOT NULL,
    "invited_by"  TEXT NOT NULL,
    "expires_at"  TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "revoked_at"  TIMESTAMP(3),
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "store_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_invites_code_key" ON "store_invites"("code");
CREATE INDEX "store_invites_email_idx" ON "store_invites"("email");
CREATE INDEX "store_invites_store_id_idx" ON "store_invites"("store_id");

ALTER TABLE "store_invites" ADD CONSTRAINT "store_invites_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_invites" ADD CONSTRAINT "store_invites_invited_by_fkey"
  FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- === Sync dua arah: master data owner -> karyawan ===
-- `local_id` adalah auto-increment per perangkat, jadi kunci unik lama membuat
-- dua perangkat saling menimpa. Baris lama dibiarkan ber-device_id kosong dan
-- akan "diklaim" oleh perangkat pertama yang push setelah upgrade — lihat
-- `claimLegacyRecords` di src/modules/sync/service.ts.
ALTER TABLE "sync_records" ADD COLUMN "device_id" TEXT NOT NULL DEFAULT '';

DROP INDEX IF EXISTS "sync_records_store_id_table_name_local_id_key";
CREATE UNIQUE INDEX "sync_records_store_id_table_name_device_id_local_id_key"
  ON "sync_records"("store_id", "table_name", "device_id", "local_id");
CREATE INDEX "sync_records_store_id_table_name_synced_at_idx"
  ON "sync_records"("store_id", "table_name", "synced_at");
