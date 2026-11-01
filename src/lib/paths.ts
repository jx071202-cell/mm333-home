const rawBase = import.meta.env.BASE_URL || '/';
const base = rawBase.replace(/\/+$/, '');

export function withBase(path: string): string {
  if (!path) return base || '/';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('//') ||
    path.startsWith('mailto:') ||
    path.startsWith('data:') ||
    path.startsWith('#')
  ) {
    return path;
  }
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
}

export const BASE = base;
