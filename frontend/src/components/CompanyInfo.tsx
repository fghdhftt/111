import type { CounterpartyCheckResult } from '@counterparty-check/shared';

interface Props {
  company: CounterpartyCheckResult['company'];
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="field">
      <dt>{label}</dt>
      <dd>{value ?? '—'}</dd>
    </div>
  );
}

function formatLegalCases(company: CounterpartyCheckResult['company']): string {
  const cases = company.legalCases;
  if (!cases || cases.total === 0) return 'Не выявлено';

  const recent = cases.recent
    .map((c) => [c.date, c.court, c.caseNumber].filter(Boolean).join(', '))
    .join('; ');

  return `Всего: ${cases.total}${cases.totalClaimAmount ? `, сумма исков: ${cases.totalClaimAmount.toLocaleString('ru-RU')} ₽` : ''}${recent ? `. Последние: ${recent}` : ''}`;
}

function formatEnforcements(company: CounterpartyCheckResult['company']): string {
  const items = company.enforcements;
  if (!items || items.total === 0) return 'Не выявлено';

  const recent = items.recent
    .map((e) => [e.number, e.date, e.subject].filter(Boolean).join(', '))
    .join('; ');

  return `Всего: ${items.total}${items.totalDebt ? `, сумма долга: ${items.totalDebt.toLocaleString('ru-RU')} ₽` : ''}${recent ? `. Последние: ${recent}` : ''}`;
}

export function CompanyInfo({ company }: Props) {
  return (
    <section className="card">
      <h2>Данные компании</h2>
      <dl className="grid">
        <Field label="Наименование компании" value={company.name} />
        <Field label="ИНН" value={company.inn} />
        <Field label="КПП" value={company.kpp} />
        <Field label="ОГРН" value={company.ogrn} />
        <Field label="Статус компании" value={company.status} />
        <Field label="Дата регистрации" value={company.registrationDate} />
        <Field label="Руководитель" value={company.director} />
        <Field label="Юридический адрес" value={company.legalAddress} />
        <Field label="Основной ОКВЭД" value={company.okved} />
        <Field label="Выручка" value={company.revenue} />
        <Field label="Прибыль" value={company.profit} />
        <Field label="Численность сотрудников" value={company.employees} />
        <Field label="Признаки ликвидации" value={company.liquidationSigns} />
        <Field label="Признаки банкротства" value={company.bankruptcySigns} />
        <Field label="Судебные дела" value={formatLegalCases(company)} />
        <Field label="Исполнительные производства" value={formatEnforcements(company)} />
      </dl>
    </section>
  );
}
