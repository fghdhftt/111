import { useCallback, useEffect, useState } from 'react';
import type { CounterpartyCheckResult } from '@counterparty-check/shared';
import { checkCounterparty, loadSavedResult, resizeWidget } from '../api/client';
import { useBitrixContext } from '../hooks/useBitrixContext';
import { CompanyInfo } from './CompanyInfo';
import { AiAnalysisBlock } from './AiAnalysisBlock';

export function CounterpartyCheckTab() {
  const { entityType, entityId, auth, loading: authLoading, error: authError } = useBitrixContext();
  const [result, setResult] = useState<CounterpartyCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    if (!auth || !entityId) return;

    try {
      const saved = await loadSavedResult({ entityType, entityId, auth });
      if (saved) {
        setResult(saved);
        resizeWidget();
      }
    } catch (err) {
      console.warn('[loadInitial] failed to load saved result:', err instanceof Error ? err.message : err);
    }
  }, [auth, entityId, entityType]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const handleCheck = async (forceRefresh = true) => {
    if (!auth || !entityId) {
      setError('Не удалось определить контекст CRM');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await checkCounterparty({
        entityType,
        entityId,
        auth,
        forceRefresh,
      });
      setResult(data);
      resizeWidget();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка проверки');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="container"><p className="muted">Загрузка...</p></div>;
  }

  if (authError) {
    return <div className="container"><p className="error">{authError}</p></div>;
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>Проверка контрагента</h1>
          <p className="muted">
            {entityType === 'deal' ? 'Сделка' : 'Лид'} #{entityId}
            {result?.source === 'cache' && ' · данные из кэша (24 ч)'}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => void handleCheck(true)}
          disabled={loading}
        >
          {loading ? 'Проверка...' : 'Проверить контрагента'}
        </button>
      </header>

      {error && <p className="error">{error}</p>}

      {!result && !loading && !error && (
        <p className="muted">
          Нажмите «Проверить контрагента», чтобы получить данные по ИНН из карточки CRM.
        </p>
      )}

      {result && (
        <>
          <CompanyInfo company={result.company} />
          <AiAnalysisBlock analysis={result.aiAnalysis} loading={loading && !result.aiAnalysis} />
          <footer className="footer muted">
            Последняя проверка: {new Date(result.checkedAt).toLocaleString('ru-RU')}
          </footer>
        </>
      )}
    </div>
  );
}
