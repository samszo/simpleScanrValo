export interface OmekaConfig {
  apiUrl: string;
  keyIdentity: string;
  keyCredential: string;
}

export interface OmekaPropertyValue {
  type: string;
  property_id: number;
  property_label?: string;
  '@value'?: string;
  '@id'?: string;
  value_resource_id?: number;
}

export interface OmekaItemPayload {
  'o:resource_class'?: { 'o:id': number };
  'o:item_set'?: Array<{ 'o:id': number }>;
  [property: string]: OmekaPropertyValue[] | { 'o:id': number } | Array<{ 'o:id': number }> | undefined;
}

export interface OmekaItem {
  'o:id': number;
  'o:title': string;
  '@id': string;
  'o:url': string;
}

export interface OmekaImportResult {
  success: boolean;
  item?: OmekaItem;
  error?: string;
}
