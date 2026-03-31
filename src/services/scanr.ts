import type {
  ScanrEntityType,
  ScanrSearchResponse,
} from '../types/scanr.ts';

const SCANR_API_BASE = 'https://api.scanr.esri.fr';

async function searchEntities(
  entityType: ScanrEntityType,
  query: string,
  page: number = 0,
  pageSize: number = 20,
): Promise<ScanrSearchResponse> {
  const url = `${SCANR_API_BASE}/api/v2/${entityType}/search`;
  const body: Record<string, unknown> = {
    query,
    page,
    pageSize,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Scanr API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<ScanrSearchResponse>;
}

export async function searchStructures(
  query: string,
  page = 0,
  pageSize = 20,
): Promise<ScanrSearchResponse> {
  return searchEntities('structures', query, page, pageSize);
}

export async function searchPersons(
  query: string,
  page = 0,
  pageSize = 20,
): Promise<ScanrSearchResponse> {
  return searchEntities('persons', query, page, pageSize);
}

export async function searchPublications(
  query: string,
  page = 0,
  pageSize = 20,
): Promise<ScanrSearchResponse> {
  return searchEntities('publications', query, page, pageSize);
}

export async function searchProjects(
  query: string,
  page = 0,
  pageSize = 20,
): Promise<ScanrSearchResponse> {
  return searchEntities('projects', query, page, pageSize);
}

export function getEntityLabel(entity: Record<string, unknown>, entityType: ScanrEntityType): string {
  const id = String(entity['id'] ?? '');
  switch (entityType) {
    case 'structures': {
      const label = entity['label'] as { default?: string; fr?: string } | undefined;
      return label?.default ?? label?.fr ?? id;
    }
    case 'persons': {
      const fullName = entity['fullName'] as string | undefined;
      const firstName = entity['firstName'] as string | undefined;
      const lastName = entity['lastName'] as string | undefined;
      return fullName ?? (`${firstName ?? ''} ${lastName ?? ''}`.trim() || id);
    }
    case 'publications': {
      const title = entity['title'] as { default?: string; fr?: string; en?: string } | undefined;
      return title?.default ?? title?.fr ?? title?.en ?? id;
    }
    case 'projects': {
      const label = entity['label'] as { default?: string; fr?: string } | undefined;
      const acronym = entity['acronym'] as string | undefined;
      return label?.default ?? label?.fr ?? acronym ?? id;
    }
    default:
      return id;
  }
}

export function getEntityDescription(entity: Record<string, unknown>, entityType: ScanrEntityType): string {
  switch (entityType) {
    case 'structures': {
      const parts: string[] = [];
      const kind = entity['kind'] as string | undefined;
      const status = entity['status'] as string | undefined;
      const addresses = entity['address'] as Array<{ city?: string; country?: string }> | undefined;
      if (kind) parts.push(kind);
      if (status) parts.push(`(${status})`);
      if (addresses?.length) {
        const city = addresses[0].city;
        const country = addresses[0].country;
        if (city) parts.push(city);
        if (country && country !== 'France') parts.push(country);
      }
      return parts.join(' · ');
    }
    case 'persons': {
      const affiliations = entity['affiliations'] as Array<{
        structure: { label: { default?: string; fr?: string } };
        active?: boolean;
      }> | undefined;
      const active = affiliations?.filter((a) => a.active !== false);
      if (active?.length) {
        const label = active[0].structure.label;
        return label.default ?? label.fr ?? '';
      }
      return '';
    }
    case 'publications': {
      const year = entity['year'] as number | undefined;
      const type = entity['type'] as string | undefined;
      const source = entity['source'] as { title?: string } | undefined;
      const parts: string[] = [];
      if (year) parts.push(String(year));
      if (type) parts.push(type);
      if (source?.title) parts.push(source.title);
      return parts.join(' · ');
    }
    case 'projects': {
      const startDate = entity['startDate'] as string | undefined;
      const endDate = entity['endDate'] as string | undefined;
      const type = entity['type'] as string | undefined;
      const parts: string[] = [];
      if (type) parts.push(type);
      if (startDate) parts.push(startDate.slice(0, 4));
      if (endDate) parts.push(`→ ${endDate.slice(0, 4)}`);
      return parts.join(' · ');
    }
    default:
      return '';
  }
}
