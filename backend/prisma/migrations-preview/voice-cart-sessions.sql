-- Kuota Keranjang Suara: satu baris per sesi mikrofon kasir.

CREATE TABLE "voice_cart_sessions" (
    "id"                TEXT NOT NULL,
    "user_id"           TEXT NOT NULL,
    "client_session_id" TEXT NOT NULL,
    "store_id"          TEXT,
    "started_at"        TIMESTAMP(3) NOT NULL,
    "offline"           BOOLEAN NOT NULL DEFAULT false,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "voice_cart_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "voice_cart_sessions_user_id_client_session_id_key"
  ON "voice_cart_sessions"("user_id", "client_session_id");
CREATE INDEX "voice_cart_sessions_user_id_started_at_idx"
  ON "voice_cart_sessions"("user_id", "started_at");

ALTER TABLE "voice_cart_sessions" ADD CONSTRAINT "voice_cart_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
