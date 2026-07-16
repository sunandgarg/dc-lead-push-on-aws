// Slug Utilities - Generate and manage unique slugs for entities

/**
 * Generate a URL-safe slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate a unique slug by appending a random suffix
 */
export function generateUniqueSlug(name: string, existingSlugs: Set<string> = new Set()): string {
  let baseSlug = generateSlug(name);
  if (!baseSlug) {
    baseSlug = 'entity';
  }
  
  let slug = baseSlug;
  let counter = 1;
  
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

/**
 * Generate a sub-slug for an entity linked to a parent
 * Format: parent-slug/entity-slug
 */
export function generateSubSlug(parentSlug: string, childName: string): string {
  const childSlug = generateSlug(childName);
  return `${parentSlug}/${childSlug}`;
}

/**
 * Parse a sub-slug to extract parent and child parts
 */
export function parseSubSlug(subSlug: string): { parentSlug: string; childSlug: string } | null {
  const parts = subSlug.split('/');
  if (parts.length !== 2) return null;
  return { parentSlug: parts[0], childSlug: parts[1] };
}

/**
 * Generate a unique upload slug with timestamp
 * Format: university-slug/upload-YYYYMMDD-HHMMSS-random
 */
export function generateUploadSlug(universitySlug: string, fileName?: string): string {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/-|:|T|\.|Z/g, '')
    .slice(0, 14);
  
  const randomPart = Math.random().toString(36).substring(2, 6);
  const fileSlug = fileName ? `-${generateSlug(fileName.replace(/\.[^.]+$/, ''))}` : '';
  
  return `${universitySlug}/upload-${timestamp}${fileSlug}-${randomPart}`;
}

/**
 * Generate a batch/log ID
 */
export function generateBatchId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `batch-${timestamp}-${random}`;
}

/**
 * Validate slug format
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(slug);
}

/**
 * Extract university slug from an upload slug
 */
export function extractUniversitySlug(uploadSlug: string): string | null {
  const parts = uploadSlug.split('/');
  return parts.length >= 1 ? parts[0] : null;
}

/**
 * Create a map of names to slugs for a list of entities
 */
export function createSlugMap<T extends { name: string }>(
  entities: T[]
): Map<string, string> {
  const slugMap = new Map<string, string>();
  const usedSlugs = new Set<string>();
  
  for (const entity of entities) {
    const slug = generateUniqueSlug(entity.name, usedSlugs);
    slugMap.set(entity.name, slug);
    usedSlugs.add(slug);
  }
  
  return slugMap;
}
