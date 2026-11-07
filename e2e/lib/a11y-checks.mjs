/**
 * The responsive a11y sweep's own checks: what axe cannot see because it needs
 * the rendered layout or a keyboard. Each takes a Playwright page and returns
 * `[{ rule, detail }]`, one entry per offending element, with `rule` from
 * CUSTOM_RULES in a11y-gate-lib.mjs.
 *
 * The functions passed to page.evaluate run in the browser, so they must be
 * self-contained: no closures over this module.
 */

/** Short, stable description of an element for a failure report. */
const DESCRIBE = `(el) => {
  const id = el.id ? '#' + el.id : '';
  const cls = typeof el.className === 'string' && el.className.trim()
    ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
  const text = (el.innerText || el.getAttribute('aria-label') || el.value || '').trim().replace(/\\s+/g, ' ').slice(0, 30);
  return el.tagName.toLowerCase() + id + cls + (text ? ' "' + text + '"' : '');
}`;

/**
 * WCAG 1.4.10 Reflow. Any visible element whose box extends past the viewport,
 * unless an ancestor SCROLLS horizontally (a data table may scroll in two
 * dimensions). An ancestor that clips (overflow hidden/clip) does not excuse
 * it: clipped content is content the reader can't reach, which is how this app
 * hid its overflow in the first place. Only the outermost offender of a
 * subtree is reported.
 *
 * This is the check the 860px dashboard assertion meant to be. That one read
 * `scrollWidth > clientWidth` on <html>, which `html, body { overflow-x: hidden }`
 * pins to equal, so it could never fail.
 */
export async function reflow(page) {
  return page.evaluate(`(() => {
    const describe = ${DESCRIBE};
    const W = window.innerWidth;
    const scrollsX = (el) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowX);
    const offenders = [];
    for (const el of document.body.querySelectorAll('*')) {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || s.display === 'contents') continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue;
      if (r.right <= W + 1 && r.left >= -1) continue;
      let a = el.parentElement;
      let excused = false;
      while (a && a !== document.body) {
        if (scrollsX(a) || offenders.includes(a)) { excused = true; break; }
        a = a.parentElement;
      }
      if (excused) continue;
      offenders.push(el);
    }
    return offenders.slice(0, 20).map((el) => {
      const r = el.getBoundingClientRect();
      return { rule: 'reflow', detail: describe(el) + ' spans ' + Math.round(r.left) + '–' + Math.round(r.right) + 'px of ' + W };
    });
  })()`);
}

/**
 * WCAG 2.5.8 Target Size (Minimum). Interactive elements under 24×24px fail
 * unless a 24px circle centred on them touches no other target. Links inside
 * a sentence are exempt, as are visually hidden native inputs (their label is
 * the target).
 */
export async function targetSize(page) {
  return page.evaluate(`(() => {
    const describe = ${DESCRIBE};
    const SEL = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], '
      + '[role=checkbox], [role=radio], [role=switch], [role=tab], [role=menuitem], [role=option], [tabindex]:not([tabindex="-1"])';
    const visible = (el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0 && r.width > 1 && r.height > 1
        && !el.closest('[inert], [aria-hidden="true"]');
    };
    const targets = [...document.querySelectorAll(SEL)].filter(visible);
    const inSentence = (el) => {
      if (el.tagName !== 'A' || getComputedStyle(el).display !== 'inline') return false;
      const parentText = (el.parentElement?.innerText || '').trim();
      return parentText.length > (el.innerText || '').trim().length + 1;
    };
    const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const distToRect = (p, r) => Math.hypot(Math.max(r.left - p.x, 0, p.x - r.right), Math.max(r.top - p.y, 0, p.y - r.bottom));
    const rects = targets.map((t) => t.getBoundingClientRect());
    const small = targets.map((t, i) => rects[i].width < 24 || rects[i].height < 24);
    const out = [];
    targets.forEach((el, i) => {
      if (!small[i] || inSentence(el)) return;
      const c = centre(rects[i]);
      const crowded = targets.some((other, j) => {
        if (j === i || other.contains(el) || el.contains(other)) return false;
        if (distToRect(c, rects[j]) < 12) return true;
        return small[j] && Math.hypot(c.x - centre(rects[j]).x, c.y - centre(rects[j]).y) < 24;
      });
      if (crowded) out.push({ rule: 'target-min-24', detail: describe(el) + ' is ' + Math.round(rects[i].width) + '×' + Math.round(rects[i].height) + 'px' });
    });
    return out.slice(0, 20);
  })()`);
}

/**
 * WCAG 1.4.12 Text Spacing. Apply the success criterion's spacing overrides,
 * then report text containers that clip (overflow hidden/clip, content larger
 * than the box) and did NOT clip before: the spacing is what broke them.
 * The override is removed afterwards.
 */
export async function textSpacing(page) {
  return page.evaluate(`(async () => {
    const describe = ${DESCRIBE};
    const clipping = () => {
      const set = new Set();
      for (const el of document.body.querySelectorAll('*')) {
        const s = getComputedStyle(el);
        const clips = ['hidden', 'clip'];
        if (!clips.includes(s.overflowX) && !clips.includes(s.overflowY)) continue;
        if (!(el.innerText || '').trim()) continue;
        if (el.clientWidth <= 1 || el.clientHeight <= 1) continue; // visually hidden
        if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) set.add(el);
      }
      return set;
    };
    const before = clipping();
    const style = document.createElement('style');
    style.textContent = '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }'
      + ' p { margin-bottom: 2em !important; }';
    document.head.appendChild(style);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const after = clipping();
    style.remove();
    const out = [];
    after.forEach((el) => {
      if (before.has(el)) return;
      if ([...after].some((o) => o !== el && o.contains(el) && !before.has(o))) return; // outermost only
      out.push({ rule: 'text-spacing', detail: describe(el) });
    });
    return out.slice(0, 20);
  })()`);
}

/**
 * Keyboard: Tab from the top of the page. The first stop should be a skip link
 * to the main content; every stop should draw an outline. The plan's focus ring
 * is an outline (dlite focus-ring tokens), so a box-shadow glow does not count:
 * the old 50%-alpha glow measured 1.85:1.
 */
export async function focus(page, { stops = 8 } = {}) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  });
  const out = [];
  const seen = [];
  for (let i = 0; i < stops; i += 1) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(`(() => {
      const describe = ${DESCRIBE};
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const s = getComputedStyle(el);
      const href = el.getAttribute('href') || '';
      const target = href.startsWith('#') && href.length > 1 ? document.getElementById(href.slice(1)) : null;
      return {
        desc: describe(el),
        outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0,
        skip: el.tagName === 'A' && !!target && (target.tagName === 'MAIN' || target.getAttribute('role') === 'main'),
      };
    })()`);
    if (!info) {
      if (i === 0) out.push({ rule: 'focus-unreachable', detail: 'first Tab left focus on <body>' });
      break;
    }
    if (i === 0 && !info.skip) out.push({ rule: 'skip-link', detail: `first stop is ${info.desc}` });
    if (seen.includes(info.desc)) break; // wrapped around a short page
    seen.push(info.desc);
    if (!info.outline) out.push({ rule: 'focus-not-visible', detail: info.desc });
  }
  return out;
}

/** What a page shows while it is still loading. */
const LOADING = '[class*="skeleton" i], [class*="spinner" i], [aria-busy="true"]';

/**
 * Wait for a page to finish loading before judging or photographing it:
 * network quiet, then no visible skeleton, spinner or aria-busy region, then
 * fonts in and two frames painted. `networkidle` alone is not enough: several
 * screens query in a chain (organization, then its forms), and the quiet gap
 * between the two let the sweep audit a skeleton.
 *
 * Conditional, never a sleep. A page that never stops loading (a permanent
 * spinner) is judged as it is after `timeout`, and reported as such.
 */
export async function settle(page, { timeout = 10000 } = {}) {
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  const loaded = await page.waitForFunction(
    (sel) => ![...document.querySelectorAll(sel)].some((el) => el.getClientRects().length > 0),
    LOADING,
    { timeout },
  ).then(() => true, () => false);
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((r) => { requestAnimationFrame(() => requestAnimationFrame(r)); });
  });
  return { stillLoading: !loaded };
}
