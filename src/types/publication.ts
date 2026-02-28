/** Front-end Publication (camelCase, Date objects) used on Index / PublicationCard */
export interface Publication {
  id: string;
  title: string;
  description?: string;
  coverUrl: string;
  publishedAt: Date;
  year: number;
  theme?: string;
  type?: string;
  pageCount: number;
  pages: string[];
  slug: string;
}

/** Raw database row shape used in Admin / Reader pages */
export interface PublicationRow {
  id: string;
  title: string;
  description: string | null;
  cover_url: string;
  published_at: string;
  created_at: string;
  year: number;
  theme: string | null;
  type: string | null;
  page_count: number;
  pages: string[];
  slug: string;
  is_a4: boolean;
  pdf_url: string | null;
}

export interface PublicationFilter {
  year?: number;
  theme?: string;
  type?: string;
  search?: string;
}

/** Predefined publication types */
export const PUBLICATION_TYPES = [
  "Jornal",
  "Newsletter",
  "Relatório",
] as const;

export type PublicationType = (typeof PUBLICATION_TYPES)[number];

/** Convert a database row to the front-end Publication shape */
export function rowToPublication(row: PublicationRow): Publication {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    coverUrl: row.cover_url,
    publishedAt: new Date(row.published_at),
    year: row.year,
    theme: row.theme || undefined,
    type: row.type || undefined,
    pageCount: row.page_count,
    pages: row.pages,
    slug: row.slug,
  };
}
