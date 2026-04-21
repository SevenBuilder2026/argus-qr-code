// Mock SICPA CDP verification API
// Always returns authentic for a valid scan; shake/long-press triggers fake mode

let _forceMode = null; // null | 'suspicious' | 'fake'

export function setForceMode(mode) {
  _forceMode = mode;
}

export function getForceMode() {
  return _forceMode;
}

const PRODUCTS = [
  {
    name: 'Doliprane 1000mg',
    brand: 'Sanofi',
    batch: 'B24-08812',
    manufactured_at: '2024-08-15',
  },
  {
    name: 'Amoxicillin 500mg',
    brand: 'Mylan',
    batch: 'C23-44021',
    manufactured_at: '2023-11-02',
  },
  {
    name: 'Ibuprofen 400mg',
    brand: 'Bayer',
    batch: 'A25-00337',
    manufactured_at: '2025-01-20',
  },
];

export async function verifyScan({ image, location, product_hint }) {
  await new Promise((r) => setTimeout(r, 1400 + Math.random() * 400));

  const status = _forceMode ?? 'authentic';
  const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];

  return {
    status,
    confidence: status === 'authentic' ? 0.94 + Math.random() * 0.05 : 0.61 + Math.random() * 0.2,
    product,
    scan_count_here_today: Math.floor(Math.random() * 18) + 4,
    store: {
      name: 'Pharmacie du Maupas',
      trust_score: 94,
      total_scans: 1247,
    },
  };
}
