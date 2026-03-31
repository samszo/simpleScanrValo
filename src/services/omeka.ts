import type { OmekaConfig, OmekaItem, OmekaImportResult, OmekaItemPayload, OmekaPropertyValue } from '../types/omeka.ts';
import type { ScanrEntityType } from '../types/scanr.ts';

// Dublin Core property IDs (standard in Omeka S)
const DC_TITLE_ID = 1;
const DC_DESCRIPTION_ID = 4;
const DC_DATE_ID = 7;
const DC_TYPE_ID = 8;
const DC_IDENTIFIER_ID = 10;
const DC_SOURCE_ID = 11;

function makeTextValue(propertyId: number, value: string): OmekaPropertyValue {
  return {
    type: 'literal',
    property_id: propertyId,
    '@value': value,
  };
}

function makeUrlValue(propertyId: number, id: string): OmekaPropertyValue {
  return {
    type: 'uri',
    property_id: propertyId,
    '@id': id,
  };
}

function buildStructurePayload(entity: Record<string, unknown>): OmekaItemPayload {
  const label = entity['label'] as { default?: string; fr?: string } | undefined;
  const title = label?.default ?? label?.fr ?? String(entity['id'] ?? '');
  const kind = entity['kind'] as string | undefined;
  const description = entity['description'] as string | undefined;
  const websites = entity['websites'] as string[] | undefined;
  const externalIds = entity['externalIds'] as Array<{ type: string; id: string }> | undefined;

  const payload: OmekaItemPayload = {
    'dcterms:title': [makeTextValue(DC_TITLE_ID, title)],
  };

  if (kind) {
    payload['dcterms:type'] = [makeTextValue(DC_TYPE_ID, kind)];
  }
  if (description) {
    payload['dcterms:description'] = [makeTextValue(DC_DESCRIPTION_ID, description)];
  }
  if (websites?.length) {
    payload['dcterms:source'] = [makeUrlValue(DC_SOURCE_ID, websites[0])];
  }
  if (externalIds?.length) {
    payload['dcterms:identifier'] = externalIds.map((ext) =>
      makeTextValue(DC_IDENTIFIER_ID, `${ext.type}:${ext.id}`),
    );
  }

  return payload;
}

function buildPersonPayload(entity: Record<string, unknown>): OmekaItemPayload {
  const fullName = entity['fullName'] as string | undefined;
  const firstName = entity['firstName'] as string | undefined;
  const lastName = entity['lastName'] as string | undefined;
  const title = fullName ?? `${firstName ?? ''} ${lastName ?? ''}`.trim();
  const externalIds = entity['externalIds'] as Array<{ type: string; id: string }> | undefined;

  const payload: OmekaItemPayload = {
    'dcterms:title': [makeTextValue(DC_TITLE_ID, title)],
  };

  if (externalIds?.length) {
    payload['dcterms:identifier'] = externalIds.map((ext) =>
      makeTextValue(DC_IDENTIFIER_ID, `${ext.type}:${ext.id}`),
    );
  }

  return payload;
}

function buildPublicationPayload(entity: Record<string, unknown>): OmekaItemPayload {
  const titleLabel = entity['title'] as { default?: string; fr?: string; en?: string } | undefined;
  const title = titleLabel?.default ?? titleLabel?.fr ?? titleLabel?.en ?? String(entity['id'] ?? '');
  const year = entity['year'] as number | undefined;
  const type = entity['type'] as string | undefined;
  const source = entity['source'] as { title?: string; publisher?: string } | undefined;
  const externalIds = entity['externalIds'] as Array<{ type: string; id: string }> | undefined;

  const payload: OmekaItemPayload = {
    'dcterms:title': [makeTextValue(DC_TITLE_ID, title)],
  };

  if (year) {
    payload['dcterms:date'] = [makeTextValue(DC_DATE_ID, String(year))];
  }
  if (type) {
    payload['dcterms:type'] = [makeTextValue(DC_TYPE_ID, type)];
  }
  if (source?.title) {
    payload['dcterms:source'] = [makeTextValue(DC_SOURCE_ID, source.title)];
  }
  if (externalIds?.length) {
    payload['dcterms:identifier'] = externalIds.map((ext) =>
      makeTextValue(DC_IDENTIFIER_ID, `${ext.type}:${ext.id}`),
    );
  }

  return payload;
}

function buildProjectPayload(entity: Record<string, unknown>): OmekaItemPayload {
  const labelObj = entity['label'] as { default?: string; fr?: string } | undefined;
  const acronym = entity['acronym'] as string | undefined;
  const title = labelObj?.default ?? labelObj?.fr ?? acronym ?? String(entity['id'] ?? '');
  const descObj = entity['description'] as { default?: string; fr?: string } | undefined;
  const description = descObj?.default ?? descObj?.fr;
  const startDate = entity['startDate'] as string | undefined;
  const endDate = entity['endDate'] as string | undefined;
  const type = entity['type'] as string | undefined;
  const externalIds = entity['externalIds'] as Array<{ type: string; id: string }> | undefined;

  const payload: OmekaItemPayload = {
    'dcterms:title': [makeTextValue(DC_TITLE_ID, title)],
  };

  if (description) {
    payload['dcterms:description'] = [makeTextValue(DC_DESCRIPTION_ID, description)];
  }
  if (type) {
    payload['dcterms:type'] = [makeTextValue(DC_TYPE_ID, type)];
  }
  if (startDate) {
    payload['dcterms:date'] = [makeTextValue(DC_DATE_ID, startDate)];
  }
  if (endDate) {
    if (payload['dcterms:date']) {
      (payload['dcterms:date'] as OmekaPropertyValue[]).push(
        makeTextValue(DC_DATE_ID, endDate),
      );
    } else {
      payload['dcterms:date'] = [makeTextValue(DC_DATE_ID, endDate)];
    }
  }
  if (externalIds?.length) {
    payload['dcterms:identifier'] = externalIds.map((ext) =>
      makeTextValue(DC_IDENTIFIER_ID, `${ext.type}:${ext.id}`),
    );
  }

  return payload;
}

function buildPayload(entity: Record<string, unknown>, entityType: ScanrEntityType): OmekaItemPayload {
  switch (entityType) {
    case 'structures':
      return buildStructurePayload(entity);
    case 'persons':
      return buildPersonPayload(entity);
    case 'publications':
      return buildPublicationPayload(entity);
    case 'projects':
      return buildProjectPayload(entity);
  }
}

export async function importToOmeka(
  config: OmekaConfig,
  entity: Record<string, unknown>,
  entityType: ScanrEntityType,
): Promise<OmekaImportResult> {
  const payload = buildPayload(entity, entityType);

  const url = new URL(`${config.apiUrl}/api/items`);
  url.searchParams.set('key_identity', config.keyIdentity);
  url.searchParams.set('key_credential', config.keyCredential);

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }

    const item = (await response.json()) as OmekaItem;
    return { success: true, item };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function testOmekaConnection(config: OmekaConfig): Promise<{ ok: boolean; error?: string }> {
  const url = new URL(`${config.apiUrl}/api`);
  url.searchParams.set('key_identity', config.keyIdentity);
  url.searchParams.set('key_credential', config.keyCredential);

  try {
    const response = await fetch(url.toString(), { method: 'GET' });
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
