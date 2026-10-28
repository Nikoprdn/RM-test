// Construit une adresse interne en tenant compte du sous-dossier (base) du site.
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
export const u = (p = '/') => {
  if (/^https?:|^mailto:|^tel:/.test(p)) return p;
  const [path, hash = ''] = p.split('#');
  const clean = ('/' + path.replace(/^\//, '')).replace(/\/?$/, path.includes('.') ? '' : '/');
  return BASE + (clean === '//' ? '/' : clean) + (hash ? '#' + hash : '');
};
export const asset = (f) => BASE + '/assets/' + f;
export const INDEXABLE = (typeof process !== 'undefined' && process.env.INDEXABLE) === '1';
