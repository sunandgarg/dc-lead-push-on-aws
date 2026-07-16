// Hierarchical Slug Utilities
// Implements deep-nested slug patterns like: /a/a.b/a.b.a/a.b.a.a/

/**
 * Generate a hierarchical slug by appending a new segment
 * @param currentPath Current path segments (e.g., ['a', 'b'])
 * @param newSegment New segment to add (e.g., 'c')
 * @returns New slug in format 'a.b.c'
 */
export function appendSlug(currentPath: string[], newSegment: string): string {
  const sanitized = sanitizeSegment(newSegment);
  if (currentPath.length === 0) {
    return sanitized;
  }
  return [...currentPath, sanitized].join('.');
}

/**
 * Parse a hierarchical slug into its path components
 * @param slug A slug like 'a.b.c'
 * @returns Array of segments ['a', 'b', 'c']
 */
export function parseSlug(slug: string): string[] {
  if (!slug) return [];
  return slug.split('.').filter(Boolean);
}

/**
 * Get the parent slug from a hierarchical slug
 * @param slug A slug like 'a.b.c'
 * @returns Parent slug 'a.b' or null if at root
 */
export function getParentSlug(slug: string): string | null {
  const parts = parseSlug(slug);
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('.');
}

/**
 * Get the current segment (last part) of a hierarchical slug
 * @param slug A slug like 'a.b.c'
 * @returns Current segment 'c'
 */
export function getCurrentSegment(slug: string): string {
  const parts = parseSlug(slug);
  return parts[parts.length - 1] || '';
}

/**
 * Get the depth of a hierarchical slug
 * @param slug A slug like 'a.b.c'
 * @returns Depth (3 for 'a.b.c')
 */
export function getSlugDepth(slug: string): number {
  return parseSlug(slug).length;
}

/**
 * Sanitize a segment for use in a slug
 * @param segment Raw segment string
 * @returns Sanitized slug segment
 */
export function sanitizeSegment(segment: string): string {
  return segment
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Build a full route path with hierarchical slugs
 * @param basePath Base path like '/lead-push/upload'
 * @param currentSlug Current hierarchical slug
 * @param newSegment New segment to navigate to
 * @returns Full route path
 */
export function buildHierarchicalRoute(
  basePath: string,
  currentSlug: string | null,
  newSegment: string
): string {
  const currentParts = currentSlug ? parseSlug(currentSlug) : [];
  const newSlug = appendSlug(currentParts, newSegment);
  return `${basePath}/${newSlug}`;
}

/**
 * Navigate up one level in the hierarchy
 * @param basePath Base path like '/lead-push/upload'
 * @param currentSlug Current hierarchical slug
 * @returns Route path for parent level
 */
export function buildParentRoute(basePath: string, currentSlug: string | null): string {
  if (!currentSlug) return basePath;
  const parentSlug = getParentSlug(currentSlug);
  return parentSlug ? `${basePath}/${parentSlug}` : basePath;
}

/**
 * Generate breadcrumb items from a hierarchical slug
 * @param basePath Base path like '/lead-push/upload'
 * @param currentSlug Current hierarchical slug
 * @param labels Optional map of segment to display label
 * @returns Array of breadcrumb items
 */
export function generateBreadcrumbs(
  basePath: string,
  currentSlug: string | null,
  labels?: Record<string, string>
): Array<{ label: string; path: string; isActive: boolean }> {
  const breadcrumbs: Array<{ label: string; path: string; isActive: boolean }> = [];
  
  if (!currentSlug) return breadcrumbs;
  
  const parts = parseSlug(currentSlug);
  let accumulatedSlug = '';
  
  parts.forEach((part, index) => {
    accumulatedSlug = accumulatedSlug ? `${accumulatedSlug}.${part}` : part;
    const isLast = index === parts.length - 1;
    
    breadcrumbs.push({
      label: labels?.[part] || part,
      path: `${basePath}/${accumulatedSlug}`,
      isActive: isLast,
    });
  });
  
  return breadcrumbs;
}

/**
 * Check if slug A is an ancestor of slug B
 * @param ancestorSlug Potential ancestor slug
 * @param descendantSlug Potential descendant slug
 * @returns True if ancestorSlug is an ancestor of descendantSlug
 */
export function isAncestorOf(ancestorSlug: string, descendantSlug: string): boolean {
  if (!ancestorSlug || !descendantSlug) return false;
  return descendantSlug.startsWith(ancestorSlug + '.');
}

/**
 * Get all ancestor slugs from a hierarchical slug
 * @param slug A slug like 'a.b.c'
 * @returns Array of ancestor slugs ['a', 'a.b']
 */
export function getAncestorSlugs(slug: string): string[] {
  const parts = parseSlug(slug);
  const ancestors: string[] = [];
  
  for (let i = 1; i < parts.length; i++) {
    ancestors.push(parts.slice(0, i).join('.'));
  }
  
  return ancestors;
}
