import { Button, Panel } from 'app/impacto-design-system';
import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import styles from './Billing.module.css';

/**
 * The rate card, editable by Puente staff.
 *
 * Prices are stored as integer minor units and edited in dollars, because
 * nobody reasons about a subscription as 15000. That conversion is the single
 * most dangerous thing on this screen: sending 150 where 15000 was meant
 * undercharges every partner by 100x, and nothing downstream would flag it —
 * the invoice would simply be wrong and look fine. So it happens in exactly two
 * places, `toDollars` and `toCents`, and is covered by its own test.
 *
 * A price that cannot be parsed is REFUSED, never coerced. `Number('free')` is
 * NaN and `parseInt` of it is 0, and a silent zero here is a partner invoiced
 * for nothing.
 */
const toDollars = (cents) => (Number.isFinite(cents) ? (cents / 100).toFixed(2) : '');

/** Returns null - never 0 - when the text is not a price. */
const toCents = (text) => {
  const value = Number(String(text).trim());
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
};

function PriceField({ label, value, onChange }) {
  return (
    <label className={styles.priceRow} htmlFor={`rate-${label}`}>
      <span className={styles.priceLabel}>{label}</span>
      <input
        id={`rate-${label}`}
        className={styles.priceInput}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

PriceField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default function RateCardPanel({ card, onSave }) {
  const { t } = useTranslation('common');
  const [draft, setDraft] = useState(null);

  // Synced in an effect, NOT derived with useState(() => ...). The page renders
  // before the network answers, so this panel's first render always has
  // card=null - and a useState initializer runs once and never again, which
  // left the fields empty forever while the screen claimed the card could not
  // be read. The request had returned 200 with every price.
  useEffect(() => {
    if (!card) { setDraft(null); return; }
    const rows = {};
    Object.entries(card.plans || {}).forEach(([k, v]) => { rows[`plan:${k}`] = toDollars(v); });
    Object.entries(card.services || {}).forEach(([k, v]) => { rows[`service:${k}`] = toDollars(v); });
    setDraft(rows);
  }, [card]);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newPrice, setNewPrice] = useState('');

  // A read that failed must not render as a card full of zeroes - that reads as
  // "everything is free" and is indistinguishable from a real configuration.
  if (!card || !draft) {
    return (
      <Panel title={t('billing_rate_card')}>
        <p className={styles.unavailable}>{t('billing_rate_card_unavailable')}</p>
      </Panel>
    );
  }

  const addService = () => {
    const code = newCode.trim();
    if (!code) return;
    // Silently overwriting an existing price with one typed into the ADD field
    // is how a rate changes without anyone deciding to change it.
    if (Object.prototype.hasOwnProperty.call(draft, `service:${code}`)) {
      setError(t('billing_rate_card_duplicate', { field: code }));
      return;
    }
    if (toCents(newPrice) === null) {
      setError(t('billing_rate_card_invalid', { field: code }));
      return;
    }
    setDraft((prev) => ({ ...prev, [`service:${code}`]: newPrice }));
    setNewCode('');
    setNewPrice('');
    setError(null);
    setSaved(false);
  };

  const removeRow = (key) => () => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSaved(false);
  };

  const set = (key) => (value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    const entries = Object.entries(draft);
    // Validate the WHOLE card before writing any of it. A partial save would
    // leave some prices new and some old, with nothing on screen saying which.
    const bad = entries.find(([, text]) => toCents(text) === null);
    if (bad) {
      setError(t('billing_rate_card_invalid', { field: bad[0].split(':')[1] }));
      return;
    }

    const plans = {};
    const services = {};
    entries.forEach(([key, text]) => {
      const [kind, code] = key.split(':');
      if (kind === 'plan') plans[code] = toCents(text);
      else services[code] = toCents(text);
    });
    setError(null);
    try {
      await onSave({ ...card, plans, services });
      setSaved(true);
    } catch (e) {
      // Never silent. If the write failed and the screen says nothing, the
      // operator believes the new rate is live and the next invoice uses the
      // old one.
      setError(e.message);
    }
  };

  return (
    <Panel title={t('billing_rate_card')}>
      {Object.keys(draft).map((key) => {
        const [kind, code] = key.split(':');
        // A plan can be re-priced but never removed here. An organization on a
        // plan the card no longer prices becomes unbillable, and the composer
        // then refuses it with a message about the rate card rather than about
        // the removal that caused it.
        const removable = kind === 'service';
        return (
          <div key={key} className={styles.priceRowWrap}>
            <PriceField label={code} value={draft[key]} onChange={set(key)} />
            {removable && (
              <span data-testid={`remove-${key}`}>
                <Button text={t('billing_rate_card_remove')} onClick={removeRow(key)} />
              </span>
            )}
          </div>
        );
      })}

      {/* Adding a service needs no deploy: the rate card grows with the work
          Puente actually sells. */}
      <div className={styles.addRow}>
        <input
          className={styles.priceInput}
          type="text"
          placeholder={t('billing_rate_card_new_code')}
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
        />
        <input
          className={styles.priceInput}
          type="text"
          inputMode="decimal"
          placeholder={t('billing_rate_card_new_price')}
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
        />
        <Button text={t('billing_rate_card_add')} onClick={addService} />
      </div>
      {error && <p className={styles.unavailable}>{error}</p>}
      {saved && <p className={styles.meta}>{t('billing_rate_card_saved')}</p>}
      <Button text={t('billing_rate_card_save')} onClick={save} />
    </Panel>
  );
}

RateCardPanel.propTypes = {
  card: PropTypes.shape({}),
  onSave: PropTypes.func.isRequired,
};

RateCardPanel.defaultProps = { card: null };
