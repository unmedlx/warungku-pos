-- Rilis aplikasi di luar Play Store: satu baris per file installer.

CREATE TYPE "ReleasePlatform" AS ENUM ('ANDROID', 'WINDOWS');

CREATE TABLE "app_releases" (
    "id"             TEXT NOT NULL,
    "platform"       "ReleasePlatform" NOT NULL,
    "version_name"   TEXT NOT NULL,
    "version_code"   INTEGER NOT NULL,
    "file_key"       TEXT NOT NULL,
    "file_name"      TEXT NOT NULL,
    "file_size"      INTEGER NOT NULL,
    "sha256"         TEXT NOT NULL,
    "changelog"      TEXT NOT NULL DEFAULT '',
    "mandatory"      BOOLEAN NOT NULL DEFAULT false,
    "published_at"   TIMESTAMP(3),
    "downloads"      INTEGER NOT NULL DEFAULT 0,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "app_releases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "app_releases_platform_version_code_key"
  ON "app_releases"("platform", "version_code");
CREATE INDEX "app_releases_platform_published_at_idx"
  ON "app_releases"("platform", "published_at");

ALTER TABLE "app_releases" ADD CONSTRAINT "app_releases_uploaded_by_id_fkey"
  FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
