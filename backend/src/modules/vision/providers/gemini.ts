import { GoogleGenAI } from '@google/genai';
import { visionConfig } from '@/config';
import { AppError } from '@/lib/error';
import { EXTRACTION_PROMPT, RESPONSE_JSON_SCHEMA, extractionResultSchema } from '../schema';
import {
  SPEECH_RESPONSE_JSON_SCHEMA,
  TRANSCRIPT_RESPONSE_JSON_SCHEMA,
  buildSpeechPrompt,
  buildTranscriptPrompt,
  speechResultSchema,
  type CatalogHints,
} from '../speech-schema';
import type {
  ExtractedProduct,
  SpeechExtractResult,
  SpokenProduct,
  VisionAudio,
  VisionExtractResult,
  VisionImage,
  VisionProvider,
} from '../types';

/**
 * Provider Gemini lewat `models.generateContent` (Generate Content API).
 *
 * Dipilih lebih dulu karena punya free tier, jadi fitur ini bisa diuji dengan
 * foto nota asli sebelum ada komitmen biaya. Kalau nanti pindah provider,
 * yang berubah hanya file ini — service, kuota, dan bentuk respons ke aplikasi
 * tidak ikut tersentuh.
 *
 * CATATAN: SDK @google/genai v2 memakai `client.models.generateContent`, bukan
 * `client.interactions.create`. `interactions` adalah Live/Agent API yang berbeda
 * tujuan dan endpoint-nya — memanggilnya untuk task non-streaming sederhana
 * menyebabkan timeout 503 karena request dikirim ke endpoint yang salah.
 */
export class GeminiVisionProvider implements VisionProvider {
  readonly name = 'gemini';
  readonly model = visionConfig.model;

  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async extractProducts(images: VisionImage[]): Promise<VisionExtractResult> {
    const promptText =
      images.length > 1
        ? `${EXTRACTION_PROMPT}\n\nAda ${images.length} foto. Baca semuanya dan gabungkan hasilnya dalam satu daftar.`
        : EXTRACTION_PROMPT;

    // Generate Content API memakai format `contents` (array of parts).
    // Tiap image dikirim sebagai inlineData (base64), bukan object `type: 'image'`
    // yang merupakan format khusus Interactions / Live API.
    const contents = [
      {
        role: 'user' as const,
        parts: [
          ...images.map((img) => ({
            inlineData: {
              mimeType: img.mimeType,
              data: img.buffer.toString('base64'),
            },
          })),
          { text: promptText },
        ],
      },
    ];

    let response: unknown;
    try {
      response = await this.client.models.generateContent({
        model: this.model,
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
      });
    } catch (err) {
      throw toAppError(err);
    }

    const text = readOutputText(response);
    if (!text) {
      throw new AppError('Provider tidak mengembalikan hasil apa pun', 502, 'VISION_EMPTY_RESPONSE');
    }

    const parsed = extractionResultSchema.safeParse(parseJson(text));
    if (!parsed.success) {
      // Bentuk yang tidak dikenali lebih baik gagal daripada diterjemahkan
      // sebagian — separuh baris yang salah baca lebih berbahaya daripada error.
      throw new AppError('Hasil pembacaan tidak dapat dipahami', 502, 'VISION_BAD_SHAPE');
    }

    const products: ExtractedProduct[] = parsed.data.products
      .filter((p) => p.name.length > 0)
      .map((p) => ({
        name: p.name,
        hpp: p.hpp,
        price: p.price,
        unit: p.unit,
        qty: p.qty,
        categoryHint: p.category_hint,
        confidence: p.confidence,
        note: p.note,
        imageIndex: Math.min(p.image_index, images.length),
      }));

    return {
      products,
      usage: readUsage(response),
      unreadableReason: products.length === 0 ? (parsed.data.unreadable_reason ?? null) : null,
    };
  }

  /**
   * Audio dikirim mentah ke model, bukan ditranskrip dulu lalu diurai.
   *
   * Alasannya ada di angka: begitu "dua ribu lima ratus" salah jadi teks, tidak
   * ada cara memperbaikinya — informasi akustiknya sudah hilang. Model yang
   * mendengar sendiri masih bisa memakai konteks produk warung Indonesia untuk
   * memutuskan, dan angka adalah keseluruhan nilai fitur ini.
   */
  async extractProductsFromAudio(
    audio: VisionAudio,
    hints: CatalogHints,
  ): Promise<SpeechExtractResult> {
    const contents = [
      {
        role: 'user' as const,
        parts: [
          {
            inlineData: {
              mimeType: audio.mimeType,
              data: audio.buffer.toString('base64'),
            },
          },
          { text: buildSpeechPrompt(hints, audio.durationSec) },
        ],
      },
    ];

    let response: unknown;
    try {
      response = await this.client.models.generateContent({
        model: this.model,
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: SPEECH_RESPONSE_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
      });
    } catch (err) {
      throw toAppError(err);
    }

    const text = readOutputText(response);
    if (!text) {
      throw new AppError('Provider tidak mengembalikan hasil apa pun', 502, 'VISION_EMPTY_RESPONSE');
    }

    const parsed = speechResultSchema.safeParse(parseJson(text));
    if (!parsed.success) {
      throw new AppError('Hasil pendengaran tidak dapat dipahami', 502, 'VISION_BAD_SHAPE');
    }

    const clampSec = (v: number | null): number | null => {
      if (v == null || !Number.isFinite(v) || v < 0) return null;
      // Model kadang mengarang detik di luar panjang rekaman. Menampilkan
      // penanda "1:20" pada rekaman 26 detik membuat tombol putar ulang
      // melompat ke kekosongan, jadi lebih baik tidak ada penanda sama sekali.
      return v > audio.durationSec + 1 ? null : Math.round(v * 10) / 10;
    };

    const products: SpokenProduct[] = parsed.data.products
      .filter((p) => p.name.length > 0)
      .map((p) => ({
        name: p.name,
        hpp: p.hpp,
        price: p.price,
        unit: p.unit,
        qty: p.qty,
        categoryHint: p.category_hint,
        confidence: p.confidence,
        note: p.note,
        startSec: clampSec(p.start_sec),
        endSec: clampSec(p.end_sec),
        heard: p.heard,
        alternatives: p.alternatives.map((a) => ({
          field: a.field,
          value: a.value as number,
          label: a.label,
        })),
      }));

    return {
      products,
      usage: readUsage(response),
      transcript: parsed.data.transcript,
      unreadableReason: products.length === 0 ? (parsed.data.unreadable_reason ?? null) : null,
    };
  }

  /**
   * Urai transkrip yang sudah dihasilkan pengenalan suara di perangkat.
   *
   * Panggilannya teks-saja: tanpa unggahan, tanpa token audio, dan balasannya
   * datang dalam hitungan detik alih-alih belasan detik. Itu memang alasan
   * jalur ini ada. Harganya dibayar di tempat lain — model tidak pernah
   * mendengar rekaman aslinya, jadi seluruh koreksi salah dengar bertumpu pada
   * konteks dan katalog toko yang dikirim bersama transkrip.
   *
   * `transcript` dikembalikan apa adanya, bukan hasil model. UI menampilkannya
   * saat tidak ada produk yang tertangkap, dan yang perlu dilihat pemilik toko
   * di saat itu adalah apa yang benar-benar didengar HP-nya.
   */
  async parseTranscript(transcript: string, hints: CatalogHints): Promise<SpeechExtractResult> {
    const contents = [
      { role: 'user' as const, parts: [{ text: buildTranscriptPrompt(hints, transcript) }] },
    ];

    let response: unknown;
    try {
      response = await this.client.models.generateContent({
        model: this.model,
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: TRANSCRIPT_RESPONSE_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
      });
    } catch (err) {
      throw toAppError(err);
    }

    const text = readOutputText(response);
    if (!text) {
      throw new AppError('Provider tidak mengembalikan hasil apa pun', 502, 'VISION_EMPTY_RESPONSE');
    }

    const parsed = speechResultSchema.safeParse(parseJson(text));
    if (!parsed.success) {
      throw new AppError('Hasil pembacaan tidak dapat dipahami', 502, 'VISION_BAD_SHAPE');
    }

    const products: SpokenProduct[] = parsed.data.products
      .filter((p) => p.name.length > 0)
      .map((p) => ({
        name: p.name,
        hpp: p.hpp,
        price: p.price,
        unit: p.unit,
        qty: p.qty,
        categoryHint: p.category_hint,
        confidence: p.confidence,
        note: p.note,
        // Teks tidak punya sumbu waktu. Dikosongkan supaya UI tidak menawarkan
        // tombol putar ulang yang tidak punya rekaman untuk diputar.
        startSec: null,
        endSec: null,
        heard: p.heard,
        alternatives: p.alternatives.map((a) => ({
          field: a.field,
          value: a.value as number,
          label: a.label,
        })),
      }));

    return {
      products,
      usage: readUsage(response),
      transcript,
      unreadableReason: products.length === 0 ? (parsed.data.unreadable_reason ?? null) : null,
    };
  }
}

/**
 * Baca teks output dari respons `models.generateContent`.
 *
 * SDK v2 mengembalikan objek GenerateContentResponse dengan properti helper
 * `text` (string langsung), atau bisa ditelusuri lewat
 * `candidates[0].content.parts[*].text`. Keduanya dicoba agar toleran terhadap
 * perubahan minor SDK.
 */
function readOutputText(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null;
  const obj = response as Record<string, unknown>;

  // Properti helper SDK: paling ringkas dan paling andal
  for (const key of ['text', 'output_text', 'outputText']) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v;
  }

  // Telusuri struktur candidates → content → parts → text
  const chunks: string[] = [];
  const walk = (node: unknown, depth: number) => {
    if (depth > 6 || !node) return;
    if (Array.isArray(node)) {
      node.forEach((n) => walk(n, depth + 1));
      return;
    }
    if (typeof node !== 'object') return;
    const rec = node as Record<string, unknown>;
    if (typeof rec.text === 'string' && rec.text.trim()) chunks.push(rec.text);
    for (const key of ['candidates', 'content', 'parts', 'steps', 'outputs']) {
      if (key in rec) walk(rec[key], depth + 1);
    }
  };
  walk(obj.candidates ?? obj.steps ?? obj.outputs, 0);

  return chunks.length > 0 ? chunks.join('') : null;
}

function readUsage(response: unknown) {
  const empty = { inputTokens: null, outputTokens: null };
  if (!response || typeof response !== 'object') return empty;

  // `usageMetadata` diperiksa lebih dulu: itulah yang benar-benar dikirim
  // GenerateContentResponse. `usage` hanya bentuk lama yang dipertahankan
  // sebagai cadangan — mendahulukannya membuat token selalu tercatat null.
  const meta = (response as Record<string, unknown>).usageMetadata;
  if (meta && typeof meta === 'object') {
    const m = meta as Record<string, unknown>;
    const pickMeta = (...keys: string[]) => {
      for (const k of keys) {
        const v = m[k];
        if (typeof v === 'number' && Number.isFinite(v)) return v;
      }
      return null;
    };
    return {
      inputTokens: pickMeta('promptTokenCount', 'input_tokens', 'inputTokens'),
      outputTokens: pickMeta('candidatesTokenCount', 'output_tokens', 'outputTokens'),
    };
  }

  const usage = (response as Record<string, unknown>).usage;
  if (!usage || typeof usage !== 'object') return empty;
  const rec = usage as Record<string, unknown>;
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = rec[k];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
    }
    return null;
  };

  return {
    inputTokens: pick('total_input_tokens', 'input_tokens', 'inputTokens'),
    outputTokens: pick('total_output_tokens', 'output_tokens', 'outputTokens'),
  };
}

/** Structured output kadang tetap terbungkus pagar kode. */
function parseJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

/**
 * Kegagalan provider diterjemahkan jadi pesan yang berguna bagi pemilik toko.
 * Kuota provider yang habis khususnya dibedakan: itu masalah operator, bukan
 * kesalahan pengguna, dan pesannya tidak boleh menyuruh mereka membeli paket.
 */
function toAppError(err: unknown): AppError {
  const status = (err as { status?: number })?.status;
  const message = err instanceof Error ? err.message : String(err);

  if (status === 429 || /quota|rate limit|resource_exhausted/i.test(message)) {
    return new AppError(
      'Layanan scan sedang penuh. Coba lagi beberapa saat lagi.',
      503,
      'VISION_PROVIDER_BUSY',
    );
  }
  if (status === 401 || status === 403) {
    console.error('[vision] kredensial provider ditolak:', message);
    return new AppError('Layanan scan belum dikonfigurasi dengan benar', 503, 'VISION_UNAVAILABLE');
  }
  if (status === 400 || /invalid.*api.*key|api.*key.*invalid/i.test(message)) {
    console.error('[vision] API key tidak valid:', message);
    return new AppError('Layanan scan belum dikonfigurasi dengan benar', 503, 'VISION_UNAVAILABLE');
  }

  console.error('[vision] provider gagal:', err);
  return new AppError('Gagal memproses foto. Coba lagi.', 502, 'VISION_FAILED');
}
