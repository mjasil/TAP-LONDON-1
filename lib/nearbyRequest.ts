export async function loadNearbyArea(collection: string, query: string, signal: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  else signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 12000);
  try {
    const response = await fetch(`/api/directory/${collection}?q=${encodeURIComponent(query)}`, {
      cache: 'no-store', signal: controller.signal,
    });
    if (!response.ok) throw new Error('Listings unavailable');
    const page = await response.json();
    if (!Array.isArray(page.items)) throw new Error('Invalid listings response');
    return page.items;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

export async function withNearbyDeadline<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([request, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Listings request timed out')), 15000);
    })]);
  } finally {
    clearTimeout(timer!);
  }
}
