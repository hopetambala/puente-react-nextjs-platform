import { Badge, EmptyState, Panel } from 'app/impacto-design-system';
import { summarizeOutstanding } from 'app/modules/billing/whoOwesWhat';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';

import styles from './Billing.module.css';

/**
 * Stripe amounts are integer minor units. Dividing by 100 for display is the
 * only place that conversion happens; the value itself never becomes a float.
 */
const formatMoney = (minorUnits, currency) => new Intl.NumberFormat(undefined, {
  style: 'currency', currency: (currency || 'usd').toUpperCase(),
}).format((minorUnits || 0) / 100);

/**
 * The billing surface — who owes what, and what each organization is on.
 *
 * Staff-only. The route guard is a courtesy; every endpoint behind this screen
 * is gated server-side on `puente_staff`.
 *
 * There is deliberately **no control that settles an invoice**. Stripe holds the
 * money and is the only ledger, so a "mark paid" button here would be the start
 * of a competing opinion about whether cash arrived. A test asserts its absence.
 */
export default function Billing({ organizations, invoices, now }) {
  const { t } = useTranslation('common');
  const outstanding = summarizeOutstanding({ invoices, now });

  const nameFor = (shortCode) => {
    const org = (organizations || []).find((o) => o.shortCode === shortCode);
    return (org && org.name) || shortCode;
  };

  return (
    <div className={styles.surface}>
      <Panel title={t('billing_who_owes_what')}>
        {/* "Could not read" and "nothing owed" must never share copy. On a money
            screen an unreadable state rendered as zero looks like good news. */}
        {outstanding.unavailable && (
          <p className={styles.unavailable}>{t('billing_outstanding_unavailable')}</p>
        )}

        {!outstanding.unavailable && outstanding.rows.length === 0 && (
          <EmptyState
            title={t('billing_nothing_outstanding')}
            description={t('billing_nothing_outstanding_detail')}
          />
        )}

        {outstanding.rows.length > 0 && (
          <>
            <div className={styles.totals}>
              {/* Per currency. One combined figure would invent an exchange rate. */}
              {Object.entries(outstanding.totals).map(([currency, amount]) => (
                <span key={currency} className={styles.total}>
                  {formatMoney(amount, currency)}
                </span>
              ))}
            </div>
            {outstanding.rows.map((invoice) => (
              <div key={invoice.stripeInvoiceId} className={styles.row}>
                <div className={`${styles.rowMain} cl-dlite-flex-1`}>
                  <span className={styles.orgName}>{nameFor(invoice.organization)}</span>
                  <span className={styles.meta}>{invoice.stripeInvoiceId}</span>
                </div>
                <span className={styles.amount}>
                  {formatMoney(invoice.amountDue, invoice.currency)}
                </span>
                {invoice.daysOverdue > 0 && (
                  <span className={styles.overdue}>
                    {t('billing_days_overdue', { count: invoice.daysOverdue })}
                  </span>
                )}
              </div>
            ))}
          </>
        )}
      </Panel>

      <Panel title={t('billing_organizations')}>
        {(organizations || []).map((org) => (
          <div key={org.shortCode} className={styles.row}>
            <div className={`${styles.rowMain} cl-dlite-flex-1`}>
              <span className={styles.orgName}>{org.name || org.shortCode}</span>
              <span className={styles.meta}>{org.shortCode}</span>
            </div>
            {/* No plan is a decision nobody has made, not a free customer.
                Rendering it as zero would quietly make the decision. */}
            <Badge text={org.plan || t('billing_no_plan')} />
          </div>
        ))}
      </Panel>
    </div>
  );
}

Billing.propTypes = {
  organizations: PropTypes.arrayOf(PropTypes.shape({})),
  invoices: PropTypes.arrayOf(PropTypes.shape({})),
  now: PropTypes.instanceOf(Date),
};

Billing.defaultProps = { organizations: [], invoices: [], now: undefined };
