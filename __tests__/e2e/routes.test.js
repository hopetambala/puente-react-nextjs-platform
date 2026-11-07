import fs from 'fs';
import path from 'path';

import { ROUTES } from '../../e2e/lib/routes.mjs';

/**
 * Every page in pages/ is in the responsive a11y sweep's route list, so a new
 * route can't ship without being checked at every width in both languages.
 */
const PAGES = path.join(__dirname, '..', '..', 'pages');
const NOT_ROUTES = /^(_app|_document|_error|404|500)$/;

function pageRoutes(dir = PAGES, base = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return e.name === 'api' ? [] : pageRoutes(path.join(dir, e.name), `${base}/${e.name}`);
    const m = e.name.match(/^(.+)\.(js|jsx|ts|tsx)$/);
    if (!m || NOT_ROUTES.test(m[1])) return [];
    return [m[1] === 'index' ? base || '/' : `${base}/${m[1]}`];
  });
}

describe('e2e/lib/routes.mjs', () => {
  it('lists every page route', () => {
    const listed = ROUTES.map((r) => r.path);
    expect(pageRoutes().filter((r) => !listed.includes(r))).toEqual([]);
  });

  it('lists no route that does not exist', () => {
    const real = pageRoutes();
    expect(ROUTES.map((r) => r.path).filter((r) => !real.includes(r))).toEqual([]);
  });
});
