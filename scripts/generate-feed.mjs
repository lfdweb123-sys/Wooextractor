// Génère feed.xml (flux produits RSS 2.0 / namespace Google "g:") à partir de
// assets/js/products.js. Compatible Meta Commerce Manager et Google Merchant Center.
// Usage : node scripts/generate-feed.mjs   (à relancer après chaque modification des produits)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://wooextractor.com";

const src = readFileSync(join(root, "assets/js/products.js"), "utf8");
const { PRODUCTS, CATEGORIES } = new Function(
  `${src}\nreturn { PRODUCTS, CATEGORIES };`
)();

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const label = (key) => CATEGORIES.find((c) => c.key === key)?.label || key;

const items = PRODUCTS.map(
  (p) => `    <item>
      <g:id>${p.id}</g:id>
      <g:title>${esc(p.name)}</g:title>
      <g:description>${esc(`${p.desc} Conditionnement : ${p.unit}.`)}</g:description>
      <g:link>${SITE}/pages/produits?cat=${esc(p.category)}</g:link>
      <g:image_link>${esc(p.media.src)}</g:image_link>
      <g:availability>${p.stock > 0 ? "in stock" : "out of stock"}</g:availability>
      <g:condition>new</g:condition>
      <g:price>${p.price.toFixed(2)} EUR</g:price>
      <g:brand>WooExtractor</g:brand>
      <g:product_type>${esc(label(p.category))}</g:product_type>
      <g:identifier_exists>no</g:identifier_exists>
    </item>`
).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>WooExtractor</title>
    <link>${SITE}</link>
    <description>Bois de chauffage, packs d'hiver et produits d'allumage</description>
${items}
  </channel>
</rss>
`;

writeFileSync(join(root, "feed.xml"), xml);
console.log(`feed.xml généré : ${PRODUCTS.length} produits`);
