// Regenerasi src/components/icons/index.ts dari docs/icon-map.json.
// Jalankan setelah mengubah peta icon: `node scripts/generate-icons.mjs`
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const map = JSON.parse(readFileSync(path.join(root, "docs/icon-map.json"), "utf8"));

const names = Object.keys(map).sort();
const missing = names.filter((n) => !existsSync(path.join(root, "src/assets/icons", `${map[n][0]}.svg`)));
if (missing.length) {
  console.error("Aset tidak ditemukan untuk:", missing.join(", "));
  process.exit(1);
}

const imports = names.map((n) => `import ${n}Svg from "@/assets/icons/${map[n][0]}.svg?react";`);
const exports = names.map((n) => {
  const note = map[n][1] === "approx" ? "  // padanan pendekatan" : "";
  // `Infinity` membayangi global, jadi diberi nama lokal sebelum di-export.
  return n === "Infinity"
    ? `const Infinity_ = createIcon(${n}Svg, "${n}");\nexport { Infinity_ as ${n} };${note}`
    : `export const ${n} = createIcon(${n}Svg, "${n}");${note}`;
});

const head = `/**
 * Registry icon aplikasi — sumbernya \`src/assets/icons\` (aset lokal, gaya solid).
 * DIBUAT OTOMATIS oleh \`scripts/generate-icons.mjs\` dari \`docs/icon-map.json\`. Jangan diedit manual.
 *
 * Nama export sengaja mengikuti nama lama lucide-react agar pemakaian di JSX tidak berubah.
 */
import { createIcon } from "./createIcon";

export { createIcon } from "./createIcon";
export type { IconProps, IconComponent } from "./createIcon";

`;

writeFileSync(path.join(root, "src/components/icons/index.ts"), `${head}${imports.join("\n")}\n\n${exports.join("\n")}\n`);
console.log(`Registry dibuat: ${names.length} icon.`);
