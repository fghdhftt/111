import type { AiAnalysis } from '@counterparty-check/shared';

interface Props {
  analysis?: AiAnalysis;
  loading?: boolean;
}

export function AiAnalysisBlock({ analysis, loading }: Props) {
  return (
    <section className="card ai-card">
      <h2>Анализ AI</h2>

      {loading && <p className="muted">Выполняется AI-анализ...</p>}

      {!loading && !analysis && (
        <p className="muted">AI-анализ будет доступен после проверки контрагента.</p>
      )}

      {analysis && (
        <div className="ai-content">
          <div className="ai-block">
            <h3>Общая оценка</h3>
            <p>{analysis.overallAssessment}</p>
          </div>

          <div className="ai-block">
            <h3>Выявленные риски</h3>
            <ul>
              {analysis.risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          </div>

          <div className="ai-block">
            <h3>Рекомендации менеджеру</h3>
            <ul>
              {analysis.recommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
