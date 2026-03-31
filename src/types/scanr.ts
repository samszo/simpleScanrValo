export type ScanrEntityType = 'structures' | 'persons' | 'publications' | 'projects';

export interface ScanrSearchRequest {
  query?: string;
  filters?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
  sort?: string;
}

export interface ScanrLabel {
  default?: string;
  fr?: string;
  en?: string;
}

export interface ScanrAddress {
  city?: string;
  country?: string;
  address?: string;
  postcode?: string;
}

export interface ScanrStructure {
  id: string;
  label: ScanrLabel;
  kind?: string;
  status?: string;
  creationYear?: number;
  closureYear?: number | null;
  address?: ScanrAddress[];
  acronym?: ScanrLabel;
  description?: string;
  websites?: string[];
  badges?: Array<{ label: ScanrLabel }>;
  domains?: Array<{ label: ScanrLabel }>;
}

export interface ScanrPerson {
  id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  domains?: Array<{ label: ScanrLabel; type?: string }>;
  affiliations?: Array<{
    structure: { id: string; label: ScanrLabel };
    active?: boolean;
  }>;
  externalIds?: Array<{ type: string; id: string }>;
}

export interface ScanrPublication {
  id: string;
  title?: ScanrLabel;
  type?: string;
  year?: number;
  source?: { title?: string; publisher?: string };
  authors?: Array<{ person?: ScanrPerson; role?: string }>;
  domains?: Array<{ label: ScanrLabel }>;
  isOa?: boolean;
  externalIds?: Array<{ type: string; id: string }>;
}

export interface ScanrProject {
  id: string;
  label?: ScanrLabel;
  acronym?: string;
  description?: ScanrLabel;
  type?: string;
  startDate?: string;
  endDate?: string;
  participants?: Array<{
    structure: { id: string; label: ScanrLabel };
    role?: string;
  }>;
  domains?: Array<{ label: ScanrLabel }>;
  externalIds?: Array<{ type: string; id: string }>;
}

export type ScanrEntity = ScanrStructure | ScanrPerson | ScanrPublication | ScanrProject;

export interface ScanrSearchResponse {
  total: { value: number };
  results: Array<{ _id: string; _source: Record<string, unknown> }>;
}
