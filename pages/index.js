import Link from 'next/link';

import styles from './index.module.scss';

const CHART_BARS = [40, 65, 30, 80, 55, 90, 45, 70, 35, 60];

const PILLAR_MANAGE_FEATURES = ['Form Creator', 'Form Manager', 'Form Marketplace', 'Consent & GDPR'];
const PILLAR_COLLECT_FEATURES = ['Offline-first data collection', 'Household geolocation', 'Supplementary configs', 'GDPR consent capture'];
const PILLAR_CURATE_FEATURES = ['Duplicate detection & merge', 'Completeness scoring', 'Community-name auditing', 'Inline record editing & CSV export'];

const MODULES = [
  { platform: 'Manage · Web', mobile: false, title: 'Form Creator', desc: 'Drag & drop blocks — headers, inputs, selects, geolocation, loops — into surveys field workers can run on Collect.', link: '/forms/form-creator', linkLabel: 'Open Form Creator →' },
  { platform: 'Manage · Web', mobile: false, title: 'Form Manager', desc: 'Browse submitted records as cards or tables. Drill in, expand rows, export to CSV.', link: '/forms/form-manager', linkLabel: 'Open Form Manager →' },
  { platform: 'Manage · Web', mobile: false, title: 'Marketplace', desc: 'Community-published form templates — medical evaluation, vitals, environmental health — install in one click.', link: '/forms/form-marketplace', linkLabel: 'Browse marketplace →' },
  { platform: 'Collect · Mobile', mobile: true, title: 'Data Collection', desc: 'Identification forms, supplementary configs, GDPR consent — all queued locally and synced when online.', link: '#', linkLabel: 'Get the app →' },
  { platform: 'Collect · Mobile', mobile: true, title: 'Find Records', desc: 'Search and edit existing household records in the field — same data model as the web side.', link: '#', linkLabel: 'See how it works →' },
  { platform: 'Manage · Web', mobile: false, title: 'Data Curation', desc: 'Find duplicates, score completeness, audit community names and fix records inline before the data is used — then export it clean.', link: '/data/data-curation', linkLabel: 'Open Data Curation →' },
];

const COMPANION_FEATURES = [
  { icon: '⌁', title: 'Offline by default', desc: 'Records, households & forms all cached on device. Queue syncs on reconnect.' },
  { icon: '⏚', title: 'Configurable forms', desc: 'Forms designed in Manage publish straight to phones — no rebuild.' },
  { icon: '◉', title: 'Geolocation + Assets', desc: 'Pin households, link them to records, view on a map back on the web.' },
  { icon: '⛨', title: 'Consent on record', desc: 'GDPR consent captured at every household. Exportable for audit, deletable on request.' },
];

const USE_CASES = [
  { tag: 'Health', title: 'Community medical clinics', desc: 'Triage forms, vitals, follow-up records — synced from mobile clinics in remote areas.', colorClass: 'useCaseBlue' },
  { tag: 'Environment', title: 'Water & sanitation surveys', desc: 'Household-level WaSH data: water source, treatment, sanitation infrastructure.', colorClass: 'useCaseYellow' },
  { tag: 'Disaster response', title: 'Rapid needs assessment', desc: 'Asset mapping & damage triage right after a hurricane — no signal required.', colorClass: 'useCaseGreen' },
  { tag: 'Custom', title: 'Your program', desc: 'Any field-collected dataset — design the form, publish to mobile, ship the insights.', colorClass: null },
];

export async function getStaticProps() {
  return { props: {} };
}

export default function Homepage() {
  return (
    <div className={styles.page}>
      {/* ── top nav ── */}
      <nav className={styles.nav}>
        <Link href="/" passHref>
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <a className={styles.navBrand}>
            <div className={styles.navBrandMark}>P</div>
            <span className={styles.navBrandName}>Puente</span>
          </a>
        </Link>
        <div className={styles.navLinks}>
          <Link href="/account/login" passHref>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a className={styles.navLink}>Sign in to Manage →</a>
          </Link>
          <a href="https://apps.apple.com/us/app/puente-collect/id1362371696" target="_blank" rel="noreferrer" className={styles.navLink}>Download Collect</a>
        </div>
      </nav>

      {/* ── hero ── */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div>
              <span className={styles.eyebrow}>Humanitarian data platform</span>
              <h1 className={styles.heroHeadline}>
                Field-grade data collection,{' '}
                <em>built for the last mile.</em>
              </h1>
              <p className={styles.heroSub}>
                Puente helps grassroots organizations design surveys, send them into the field
                offline, and turn the results into{' '}
                <span className={styles.heroHighlight}>decisions that reach people</span>.
              </p>
              <div className={styles.heroCta}>
                <Link href="/account/login" passHref>
                  {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                  <a className={`${styles.btn} ${styles.btnPrimary}`}>Open Puente Manage →</a>
                </Link>
                <a href="https://apps.apple.com/us/app/puente-collect/id1362371696" target="_blank" rel="noreferrer" className={`${styles.btn} ${styles.btnGhost}`}>Download Collect</a>
              </div>
              <div className={styles.heroMeta}>
                <span className={styles.heroMetaItem}>Service operational</span>
                <span className={styles.heroMetaMono}>v0.1.2 · Mobile 12.7.1</span>
              </div>
            </div>

            <div className={styles.heroIllustration}>
              <div className={styles.heroIllustrationInner}>
                {/* dashboard window mock */}
                <div className={styles.previewWindow}>
                  <div className={styles.previewChrome}>
                    <div className={styles.previewChromeDot} />
                    <div className={styles.previewChromeDot} />
                    <div className={styles.previewChromeDot} />
                  </div>
                  <div className={styles.previewTitle}>Manage · Data Curation</div>
                  <div className={styles.previewH3}>Environmental health · record review</div>
                  <div className={styles.previewStats}>
                    {[['1,284', 'Records'], ['62%', 'Treated water'], ['14', 'Surveyors']].map(([num, label]) => (
                      <div key={label} className={styles.previewStat}>
                        <div className={styles.previewStatNum}>{num}</div>
                        <div className={styles.previewStatLabel}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.previewChart}>
                    {CHART_BARS.map((h, i) => (
                      <div
                        key={i} // eslint-disable-line react/no-array-index-key
                        className={i === CHART_BARS.length - 1 ? styles.previewBarLast : styles.previewBar}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* phone mock */}
                <div className={styles.previewPhone}>
                  <div className={styles.phoneScreen}>
                    <div className={styles.phoneTitle}>Home</div>
                    <div className={styles.phoneWelcome}>Welcome, Yolanda</div>
                    <div className={styles.phoneCard}>
                      <div className={styles.phoneCardHead}>
                        <span>Recent activity</span>
                        <span>⟲</span>
                      </div>
                      <div className={styles.phoneCardCount}>42</div>
                      <div className={styles.phoneTrend}>↑ +18%</div>
                    </div>
                    <div className={styles.phoneGrid}>
                      {[['My surveys', '18'], ['Org surveys', '218']].map(([label, count]) => (
                        <div key={label} className={styles.phoneCard}>
                          <div className={styles.phoneCardHead}><span>{label}</span></div>
                          <div className={styles.phoneCardCount} style={{ fontSize: 13 }}>{count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── how it works ── */}
      <section className={styles.how}>
        <div className={styles.container}>
          <div className={styles.howHead}>
            <span className={styles.eyebrow}>How Puente works</span>
            <h2 className={styles.sectionTitle}>
              One workflow, <em>three people.</em>
            </h2>
            <p className={styles.sectionSub}>
              A survey passes through three pairs of hands. Manage and Collect each exist
              to make one of those hands faster.
            </p>
          </div>

          <div className={styles.pillars}>
            <div className={styles.pillar}>
              <div className={styles.pillarNum}>01 / Design</div>
              <div className={styles.pillarIcon}>M</div>
              <div className={styles.pillarTitle}>The program manager</div>
              <div className={styles.pillarPlatform}>Works in Manage · Web</div>
              <p className={styles.pillarBody}>
                Designs the survey, publishes it to the field team, watches submissions roll
                in from the browser.
              </p>
              <ul className={styles.pillarFeatures}>
                {PILLAR_MANAGE_FEATURES.map((f) => <li key={f} className={styles.pillarFeature}>{f}</li>)}
              </ul>
            </div>

            <div className={styles.pillar}>
              <div className={styles.pillarNum}>02 / Collect</div>
              <div className={`${styles.pillarIcon} ${styles.pillarIconCollect}`}>C</div>
              <div className={styles.pillarTitle}>The surveyor</div>
              <div className={styles.pillarPlatform} style={{ color: 'var(--tk-dlite-primitive-color-yellow-700)' }}>Works in Collect · iOS & Android</div>
              <p className={styles.pillarBody}>
                Picks up a phone, runs the survey door-to-door, captures households even when
                there&apos;s no signal. Syncs the moment they&apos;re back online.
              </p>
              <ul className={styles.pillarFeatures}>
                {PILLAR_COLLECT_FEATURES.map((f) => <li key={f} className={styles.pillarFeature}>{f}</li>)}
              </ul>
            </div>

            <div className={styles.pillar}>
              <div className={styles.pillarNum}>03 / Curate</div>
              <div className={`${styles.pillarIcon} ${styles.pillarIconAnalyze}`}>D</div>
              <div className={styles.pillarTitle}>The data steward</div>
              <div className={styles.pillarPlatform}>Back in Manage · Web</div>
              <p className={styles.pillarBody}>
                Reviews what came back from the field — merges duplicates, fixes gaps,
                standardizes community names — then exports a clean dataset whoever can
                act on it.
              </p>
              <ul className={styles.pillarFeatures}>
                {PILLAR_CURATE_FEATURES.map((f) => <li key={f} className={styles.pillarFeature}>{f}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── modules grid ── */}
      <section className={styles.modules}>
        <div className={styles.container}>
          <div className={styles.modulesHead}>
            <h2>Every part of the platform <em>is built around the field worker.</em></h2>
            <p>
              Designed to feel coherent whether you&apos;re at a desk in San Juan or on a moto
              outside Las Matas — because it&apos;s the same team using both.
            </p>
          </div>
          <div className={styles.modulesGrid}>
            {MODULES.map((m) => (
              <div key={m.title} className={styles.module}>
                <div className={m.mobile ? `${styles.modulePlatform} ${styles.modulePlatformMobile}` : styles.modulePlatform}>
                  {m.platform}
                </div>
                <h3 className={styles.moduleTitle}>{m.title}</h3>
                <p className={styles.moduleDesc}>{m.desc}</p>
                <a href={m.link} className={styles.moduleLink}>{m.linkLabel}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── companion ── */}
      <section className={styles.companion}>
        <div className={styles.container}>
          <div className={styles.companionGrid}>
            <div>
              <span className={styles.eyebrow}>Puente Collect · iOS & Android</span>
              <h2 className={styles.companionTitle}>
                The phone in <em>a surveyor&apos;s hand</em> is half of the platform.
              </h2>
              <p className={styles.companionSub}>
                Built on Expo, optimized for offline. Same dlite design tokens as the web,
                so a form looks like itself everywhere it appears.
              </p>
              <div className={styles.companionFeatures}>
                {COMPANION_FEATURES.map((f) => (
                  <div key={f.title} className={styles.companionFeature}>
                    <div className={styles.companionFeatureIcon}>{f.icon}</div>
                    <div className={styles.companionFeatureText}>
                      <span className={styles.companionFeatureTitle}>{f.title}</span>
                      <span className={styles.companionFeatureDesc}>{f.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.storeButtons}>
                <a
                  href="https://apps.apple.com/us/app/puente-collect/id1362371696"
                  target="_blank"
                  rel="noreferrer"
                  className={`${styles.btn} ${styles.btnGhost}`}
                >
                  App Store
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=puente.collect&hl=en_US"
                  target="_blank"
                  rel="noreferrer"
                  className={`${styles.btn} ${styles.btnGhost}`}
                >
                  Google Play
                </a>
              </div>
            </div>

            <div className="cl-dlite-flex cl-dlite-justify-center">
              <div className={styles.phoneLarge}>
                <div className={styles.phoneLargeTitle}>Home</div>
                <div className={styles.phoneLargeWelcome}>Welcome back, Yolanda</div>
                <div className={styles.phoneLargeCard}>
                  <div className={styles.phoneLargeCardHead}>
                    <span>Recent activity</span><span>⟲</span>
                  </div>
                  <div className={styles.phoneLargeCardCount}>42</div>
                  <div className={styles.phoneLargeTrend}>↑ +18%</div>
                </div>
                <div className={styles.phoneLargeGrid}>
                  {[['My surveys', '18', '↑ +12%'], ['Org surveys', '218', '↑ +34%'], ['My vitals', '12', '↓ −4%'], ['Org vitals', '86', '↑ +8%']].map(([label, count, trend]) => (
                    <div key={label} className={styles.phoneLargeCard}>
                      <div className={styles.phoneLargeCardHead}><span>{label}</span></div>
                      <div className={styles.phoneLargeCardCount} style={{ fontSize: 18 }}>{count}</div>
                      <div className={styles.phoneLargeTrend}>{trend}</div>
                    </div>
                  ))}
                </div>
                <div className={styles.phoneLargeTabbar}>
                  {[['⌂', 'Home', true], ['⊟', 'Collect', false], ['⌕', 'Find', false], ['◉', 'Assets', false], ['◌', 'More', false]].map(([icon, label, active]) => (
                    <div key={label} className={active ? `${styles.phoneLargeTab} ${styles.phoneLargeTabActive}` : styles.phoneLargeTab}>
                      <span className={styles.phoneLargeTabIcon}>{icon}</span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── use cases ── */}
      <section className={styles.useCases}>
        <div className={styles.container}>
          <div className={styles.useCasesHead}>
            <span className={styles.eyebrow}>Built for</span>
            <h2 className={styles.sectionTitle}>
              Programs that need the data <em>more than the dashboard.</em>
            </h2>
          </div>
          <div className={styles.useCasesGrid}>
            {USE_CASES.map((uc) => (
              <div
                key={uc.title}
                className={`${styles.useCase} ${uc.colorClass ? styles[uc.colorClass] : ''}`}
              >
                <div className={styles.useCaseTag}>{uc.tag}</div>
                <div>
                  <h3 className={styles.useCaseTitle}>{uc.title}</h3>
                  <p className={styles.useCaseDesc}>{uc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── cta band ── */}
      <section className={styles.ctaBand}>
        <div className={styles.container}>
          <h2 className={styles.ctaTitle}>Less software. <em>More fieldwork.</em></h2>
          <p className={styles.ctaSub}>
            Open Manage in your browser, sketch a form, hand your team a phone.
            You can be collecting by tomorrow.
          </p>
          <div className={styles.ctaButtons}>
            <Link href="/account/login" passHref>
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <a className={`${styles.btn} ${styles.btnPrimary}`}>Sign in to Manage</a>
            </Link>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a href="#" className={`${styles.btn} ${styles.btnGhost} ${styles.ctaBtnGhost}`}>
              Read the docs
            </a>
          </div>
        </div>
      </section>

      {/* ── footer ── */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <div className={styles.footerBrandRow}>
                <div className={styles.footerBrandMark}>P</div>
                Puente
              </div>
              <p className={styles.footerTagline}>
                Humanitarian data collection platform.
                Open-source, MIT-licensed, built by and for grassroots organizations.
              </p>
            </div>
            <div>
              <h5 className={styles.footerColTitle}>Product</h5>
              <ul className={styles.footerLinks}>
                {['Manage', 'Collect', 'dlite tokens', 'Storybook'].map((l) => (
                  // eslint-disable-next-line jsx-a11y/anchor-is-valid
                  <li key={l}><a href="#" className={styles.footerLink}>{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className={styles.footerColTitle}>Resources</h5>
              <ul className={styles.footerLinks}>
                {['Documentation', 'Changelog', 'Contributing'].map((l) => (
                  // eslint-disable-next-line jsx-a11y/anchor-is-valid
                  <li key={l}><a href="#" className={styles.footerLink}>{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className={styles.footerColTitle}>Organization</h5>
              <ul className={styles.footerLinks}>
                {['puente-dr.org', 'GitHub', 'Contact'].map((l) => (
                  // eslint-disable-next-line jsx-a11y/anchor-is-valid
                  <li key={l}><a href="#" className={styles.footerLink}>{l}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className={styles.footerBottom}>© 2026 Puente · MIT License</div>
        </div>
      </footer>
    </div>
  );
}
