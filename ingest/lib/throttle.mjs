// Petit utilitaire : exécute des tâches async avec concurrence limitée
// et une pause minimale entre deux démarrages (politesse envers Yahoo).
export async function runPool(items, worker, { concurrency = 5, minGapMs = 250 } = {}) {
  const results = new Array(items.length);
  let idx = 0;
  let lastStart = 0;

  async function next() {
    while (idx < items.length) {
      const i = idx++;
      const wait = Math.max(0, lastStart + minGapMs - Date.now());
      if (wait) await sleep(wait);
      lastStart = Date.now();
      try {
        results[i] = await worker(items[i], i);
      } catch (err) {
        results[i] = { __error: err.message };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
  return results;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};
