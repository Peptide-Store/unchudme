// Catalog + sample lot data.
// BRAND is a placeholder — change it in one place.
// Catalog = supplier "Warehouse A" (Oregon) list, struck-through items removed. One listing per compound;
// each vial size / blend / formulation is an option on the product page.
//   price = average single-vial price across the competitor sites in research/ (filled in by prices.js).
//   Supplier costs are kept out of the site (research/supplier-costs.json, not committed).
// Chemical data: blank where not confirmed. Verify every CAS / MW / formula against the manufacturer's spec sheet before launch.
// Lot data below is SAMPLE ONLY — replace with the real lab reports before going live.

const BRAND = { name: "Aura Pharma", domain: "aurapharma.us", tagline: "Research peptides, documented to the batch." };

const CATEGORIES = [
  { id: "peptide", label: "Peptides" },
  { id: "blend", label: "Blends" },
  { id: "bioreg", label: "Bioregulators" },
  { id: "small", label: "Small molecules & cofactors" },
  { id: "supply", label: "Supplies" },
];

// o(label) → option; price stays null (shown as "Price on request") until prices.js sets it
const o = (label) => ({ label, price: null });
const mg = (...sizes) => sizes.map((n) => o(`${n} mg`));

const PRODUCTS = [
  // ---- peptides ----
  { id: "glp1-r", name: "GLP1-R", cat: "peptide", aka: "glp1r glp-1 r", code: "GLPR", formula: "C221H342N46O68", mw: 4731.3, cas: "2381089-83-2",
    sizes: mg(10) },
  { id: "glp1-t", name: "GLP1-T", cat: "peptide", aka: "glp1t glp-1 t", code: "GLPT", formula: "C225H348N48O68", mw: 4813.5, cas: "2023788-19-2",
    sizes: mg(10) },
  { id: "tesamorelin", name: "Tesamorelin", cat: "peptide", aka: "tesa", formula: "C221H366N72O67S", mw: 5135.9, cas: "218949-48-5",
    sizes: mg(10) },
  { id: "ipamorelin", name: "Ipamorelin", cat: "peptide", seq: "Aib-H-D-2Nal-D-F-K-NH2", formula: "C38H49N9O5", mw: 711.9, cas: "170851-70-4",
    sizes: mg(10) },
  { id: "mots-c", name: "MOTS-c", cat: "peptide", seq: "MRWQEMGYIFYPRKLR", formula: "C101H152N28O22S2", mw: 2174.6, cas: "1627580-64-6",
    sizes: mg(10, 40) },
  { id: "ss-31", name: "SS-31", cat: "peptide", aka: "elamipretide", seq: "D-Arg-Dmt-Lys-Phe-NH2", formula: "C32H49N9O5", mw: 639.8, cas: "736992-21-5",
    sizes: mg(10) },
  { id: "bpc-157", name: "BPC-157", cat: "peptide", seq: "GEPPPGKPADDAGLV", formula: "C62H98N16O22", mw: 1419.5, cas: "137525-51-0",
    sizes: mg(10) },
  { id: "tb-500", name: "TB-500", cat: "peptide", aka: "thymosin beta 4", formula: "C212H350N56O78S", mw: 4963.4, cas: "77591-33-4",
    sizes: mg(10) },
  { id: "adamax", name: "Adamax", cat: "peptide", aka: "984",
    sizes: mg(10) },
  { id: "melanotan-2", name: "Melanotan II", cat: "peptide", aka: "MT2", formula: "C50H69N15O9", mw: 1024.2, cas: "121062-08-6",
    sizes: mg(10) },
  { id: "ghk-cu", name: "GHK-Cu", cat: "peptide", seq: "GHK · Cu(II)", formula: "C14H22CuN6O4", mw: 401.9,
    sizes: mg(50, 100) },

  // ---- blends ----
  { id: "bpc-tb", name: "BPC-157 + TB-500", cat: "blend", aka: "BB10 BB20",
    sizes: [o("BPC 10 mg + TB 10 mg")] },
  { id: "cjc-ipa", name: "CJC-1295 (without DAC) + Ipamorelin", cat: "blend", aka: "CP10 CP20",
    sizes: [o("CJC 10 mg + Ipa 10 mg")] },
  { id: "klow", name: "KLOW", cat: "blend", aka: "KLOW80",
    sizes: mg(80) },

  // ---- bioregulators ----
  { id: "epitalon", name: "Epitalon", cat: "bioreg", aka: "EPI", seq: "AEDG", formula: "C14H22N4O9", mw: 390.4, cas: "307297-39-8",
    sizes: mg(50) },

  // ---- small molecules & cofactors ----
  { id: "nad", name: "NAD+", cat: "small", formula: "C21H27N7O14P2", mw: 663.4, cas: "53-84-9",
    sizes: mg(500) },

  // ---- supplies ----
  { id: "bac-water", name: "BAC water", cat: "supply", aka: "bacteriostatic water reconstitution", noLots: true,
    spec: { form: "Sterile water with 0.9% benzyl alcohol, sealed glass vial", purity: null, storage: "Room temperature, protected from light" },
    sizes: [o("3 ml")] },
];

// Common to every product (a product's own spec overrides a field; null hides it)
const SPEC = {
  form: "Lyophilized powder, sealed glass vial",
  purity: "≥ 98% (HPLC), batch-specific result on COA",
  storage: "−20 °C, desiccated, protected from light",
};

// SAMPLE lots — deterministic fake data so the COA UI can be designed. Not real results.
const LOTS = PRODUCTS.filter((p) => !p.noLots).flatMap((p, i) =>
  [0, 1].map((k) => ({
    lot: `AP-${p.code ?? p.id.replace(/[^a-z0-9]/g, "").slice(0, 4).toUpperCase()}-26${String(3 + k * 4 + (i % 3)).padStart(2, "0")}`,
    productId: p.id,
    date: `2026-${String(3 + k * 4 + (i % 3)).padStart(2, "0")}-1${i % 9}`,
    purity: (98.6 + ((i * 7 + k * 3) % 13) / 10).toFixed(2),
    identity: "Conforms (MS)",
    // measured peptide in the vial, a little over the labelled amount as on the real reports; single-mg sizes only
    size: p.sizes[0].label,
    content: /^[\d.]+ mg$/.test(p.sizes[0].label) ? `${(parseFloat(p.sizes[0].label) * (1.02 + ((i + k) % 7) / 100)).toFixed(2)} mg` : null,
    lab: "Independent third-party lab",
    sample: true,
  }))
);

// Real lab reports: headline results here; the full certificate is an Aura Pharma PDF in the Cloudflare R2 bucket
// aura-reports, filed under its certificate number (current batch only). Entries are printed by tools/coa/generate.mjs;
// the D1 register aura-coa links each number to the lab's original in aura-archive/<certNo>/ (see CERTIFICATIONS.md).
// Batch, task numbers and verification keys stay off the site (in the register, given on request).
const REPORTS_URL = "https://pub-9777663d84154689864064a7d51bc5e5.r2.dev"; // switch to https://reports.aurapharma.us once the domain is on Cloudflare
const REPORTS = [
  { productId: "glp1-r", certNo: "AP-0001", size: "10 mg", date: "2026-07-30", lab: "Janoshik Analytical", purity: "99.009", identity: "GLP1-R (blind test)", content: "10.60 mg", verify: "janoshik.com/verify", pdf: `${REPORTS_URL}/AP-0001.pdf?v=2`, img: `${REPORTS_URL}/AP-0001.webp?v=2` },
  { productId: "tesamorelin", certNo: "AP-0002", size: "10 mg", date: "2026-09-01", lab: "Independent partner lab (report issued by tjqxgd.com)", purity: "99.52", identity: "Conforms (LC-MS)", content: "11.98 mg", appearance: "White powder", verify: "tjqxgd.com/coa-verify", pdf: `${REPORTS_URL}/AP-0002.pdf?v=2`, img: `${REPORTS_URL}/AP-0002.webp?v=2` },
  { productId: "glp1-r", certNo: "AP-0003", size: "20 mg", date: "2026-08-02", lab: "Janoshik Analytical", purity: "99.576", identity: "GLP1-R (blind test)", content: "20.94 mg", verify: "janoshik.com/verify", pdf: `${REPORTS_URL}/AP-0003.pdf?v=2`, img: `${REPORTS_URL}/AP-0003.webp?v=2` },
  { productId: "glp1-r", certNo: "AP-0004", size: "30 mg", date: "2025-10-01", lab: "Janoshik Analytical", purity: "99.828", identity: "GLP1-R", content: "36.15 mg", verify: "janoshik.com/verify", pdf: `${REPORTS_URL}/AP-0004.pdf?v=2`, img: `${REPORTS_URL}/AP-0004.webp?v=2` },
  { productId: "glp1-t", certNo: "AP-0005", size: "15 mg", date: "2025-10-01", lab: "Janoshik Analytical", purity: "99.653", identity: "GLP1-T", content: "15.41 mg", verify: "janoshik.com/verify", pdf: `${REPORTS_URL}/AP-0005.pdf?v=2`, img: `${REPORTS_URL}/AP-0005.webp?v=2` },
  { productId: "glp1-t", certNo: "AP-0006", size: "30 mg", date: "2026-07-30", lab: "Janoshik Analytical", purity: "99.588", identity: "GLP1-T (blind test)", content: "35.42 mg", verify: "janoshik.com/verify", pdf: `${REPORTS_URL}/AP-0006.pdf?v=2`, img: `${REPORTS_URL}/AP-0006.webp?v=2` },
  { productId: "glp1-t", certNo: "AP-0007", size: "60 mg", date: "2025-10-01", lab: "Janoshik Analytical", purity: "99.825", identity: "GLP1-T", content: "64.52 mg", verify: "janoshik.com/verify", pdf: `${REPORTS_URL}/AP-0007.pdf?v=2`, img: `${REPORTS_URL}/AP-0007.webp?v=2` },
  { productId: "bpc-157", certNo: "AP-0008", size: "10 mg", date: "2025-10-01", lab: "Janoshik Analytical", purity: "99.795", identity: "BPC-157", content: "12.27 mg", verify: "janoshik.com/verify", pdf: `${REPORTS_URL}/AP-0008.pdf?v=2`, img: `${REPORTS_URL}/AP-0008.webp?v=2` },
  { productId: "tb-500", certNo: "AP-0009", size: "10 mg", date: "2025-11-06", lab: "Janoshik Analytical", purity: "99.425", identity: "TB-500", content: "10.74 mg", verify: "janoshik.com/verify", pdf: `${REPORTS_URL}/AP-0009.pdf?v=2`, img: `${REPORTS_URL}/AP-0009.webp?v=2` },
  { productId: "ghk-cu", certNo: "AP-0010", size: "50 mg", date: "2026-07-30", lab: "Janoshik Analytical", purity: "99.970", identity: "GHK-Cu", content: "58.58 mg (48.56 mg) [10.02 mg]", verify: "janoshik.com/verify", pdf: `${REPORTS_URL}/AP-0010.pdf?v=2`, img: `${REPORTS_URL}/AP-0010.webp?v=2` },
  { productId: "ghk-cu", certNo: "AP-0011", size: "100 mg", date: "2025-10-01", lab: "Janoshik Analytical", purity: "99.915", identity: "GHK-Cu", content: "117.29 mg", verify: "janoshik.com/verify", pdf: `${REPORTS_URL}/AP-0011.pdf?v=2`, img: `${REPORTS_URL}/AP-0011.webp?v=2` },
  { productId: "mots-c", certNo: "AP-0012", size: "40 mg", date: "2025-10-01", lab: "Janoshik Analytical", purity: "99.307", identity: "MOTS-c", content: "40.96 mg", verify: "janoshik.com/verify", pdf: `${REPORTS_URL}/AP-0012.pdf?v=2`, img: `${REPORTS_URL}/AP-0012.webp?v=2` },
  { productId: "bpc-tb", certNo: "AP-0013", size: "BPC 5 mg + TB 5 mg", date: "2026-07-30", lab: "Janoshik Analytical", identity: "Components confirmed", content: "BPC-157 4.95 mg · TB-500 4.82 mg", verify: "janoshik.com/verify", pdf: `${REPORTS_URL}/AP-0013.pdf?v=2`, img: `${REPORTS_URL}/AP-0013.webp?v=2` },
  { productId: "bpc-tb", certNo: "AP-0014", size: "BPC 10 mg + TB 10 mg", date: "2025-11-24", lab: "Janoshik Analytical", identity: "Components confirmed", content: "BPC-157 10.44 mg · TB-500 10.14 mg", verify: "janoshik.com/verify", pdf: `${REPORTS_URL}/AP-0014.pdf?v=2`, img: `${REPORTS_URL}/AP-0014.webp?v=2` },
  { productId: "cjc-ipa", certNo: "AP-0015", size: "CJC 5 mg + Ipa 5 mg", date: "2025-11-24", lab: "Janoshik Analytical", identity: "Components confirmed", content: "CJC-1295 5.90 mg · Ipamorelin 7.15 mg", verify: "janoshik.com/verify", pdf: `${REPORTS_URL}/AP-0015.pdf?v=2`, img: `${REPORTS_URL}/AP-0015.webp?v=2` },
  { productId: "klow", certNo: "AP-0016", size: "80 mg", date: "2025-09-30", lab: "Janoshik Analytical", identity: "Components confirmed", content: "GHK-Cu 60.20 mg · BPC-157 12.12 mg · TB-500 11.50 mg", verify: "janoshik.com/verify", pdf: `${REPORTS_URL}/AP-0016.pdf?v=2`, img: `${REPORTS_URL}/AP-0016.webp?v=2` },
  { productId: "glow", certNo: "AP-0017", size: "70 mg", date: "2025-11-05", lab: "Janoshik Analytical", identity: "Components confirmed", content: "GHK-Cu 52.22 mg · BPC-157 10.20 mg · TB-500 10.19 mg", verify: "janoshik.com/verify", pdf: `${REPORTS_URL}/AP-0017.pdf?v=2`, img: `${REPORTS_URL}/AP-0017.webp?v=2` },
];
// a real report replaces that product's sample lots; reports for products or sizes no longer sold stay off the site
const SOLD = REPORTS.filter((r) => PRODUCTS.some((p) => p.id === r.productId && p.sizes.some((s) => s.label === r.size)));
LOTS.splice(0, LOTS.length, ...SOLD, ...LOTS.filter((l) => !SOLD.some((r) => r.productId === l.productId)));
