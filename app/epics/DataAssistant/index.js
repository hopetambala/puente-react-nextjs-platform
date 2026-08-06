import { useTranslation } from 'next-i18next';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';

import styles from './index.module.css';
import useAssistantChat from './useAssistantChat';

const STARTER_QUESTIONS = [
  '¿Cuántas familias registramos este mes?',
  '¿Qué encuestadores estuvieron activos esta semana?',
  'How many records were collected in the last 30 days?',
];

export default function DataAssistant({ open, onClose }) {
  const { t } = useTranslation('common');
  const {
    messages, sendMessage, isLoading, error,
  } = useAssistantChat();
  const [draft, setDraft] = useState('');
  const [toolStatus, setToolStatus] = useState(null);
  const inputRef = useRef(null);

  // Move focus into the drawer on open and return it to the opener on close.
  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    if (inputRef.current) inputRef.current.focus();
    return () => {
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, [open]);

  // Close on Escape from anywhere in the drawer (listener on document so it
  // works regardless of which control inside the drawer holds focus).
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const send = (text) => {
    if (!text.trim() || isLoading) return;
    setToolStatus(null);
    sendMessage(text, { onToolStatus: setToolStatus });
    setDraft('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    send(draft);
  };

  return (
    <aside
      className={styles.drawer}
      data-testid="data-assistant"
      role="dialog"
      aria-modal="true"
      aria-label={t('assistant_title')}
    >
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <span className={styles.title}>{t('assistant_title')}</span>
          <span className={styles.beta}>{t('assistant_beta')}</span>
        </div>
        <button
          type="button"
          className={styles.close}
          aria-label={t('assistant_close')}
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyText}>{t('assistant_empty')}</p>
            {STARTER_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                data-testid="starter-question"
                className={styles.starter}
                onClick={() => send(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {messages.map((message, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={`${i}-${message.role}`}
            className={message.role === 'user' ? styles.userBubble : styles.assistantBubble}
          >
            {message.content}
          </div>
        ))}
        {isLoading && (
          <div className={styles.toolStatus}>
            {toolStatus ? t('assistant_tool_searching') : t('assistant_thinking')}
          </div>
        )}
        {error && <div className={styles.error}>{t('assistant_error')}</div>}
      </div>

      <form className={styles.inputRow} data-testid="assistant-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          value={draft}
          placeholder={t('assistant_placeholder')}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button className={styles.send} type="submit" disabled={isLoading}>
          {t('assistant_send')}
        </button>
      </form>
    </aside>
  );
}

DataAssistant.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
