import type { AlosaurRequest } from "alosaur/mod.ts";

export interface Entry {
  date: Date;
  headers: UnknownObject | null;
  params: UnknownObject | null;
  body: UnknownObject | null;
}

interface UnknownObject {
  [key: string]: unknown;
}

export async function parseEntry(request: AlosaurRequest): Promise<Entry> {
    const headers = parseIterable(request.headers);
    const params = parseIterable(new URL(request.url).searchParams)
    const body = await request.body();

    return {
      date: new Date(),
      headers: validateEntryItem(headers),
      params: validateEntryItem(params),
      body: validateEntryItem(body)
    };
}

function validateEntryItem(item: UnknownObject): UnknownObject | null {
  return Object.keys(item).length ? item : null
}

function parseIterable<T extends DomIterable<string, string>>(itrs: T): UnknownObject {
  const parsed: UnknownObject = {};
  
  for (const itr of itrs.entries()) {
    const [key, value] = itr;
    parsed[key] = value;
  }

  return parsed;
}
