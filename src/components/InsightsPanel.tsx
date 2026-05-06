import type { ConversationInsights } from '../lib/insights'

type Props = {
  insights: ConversationInsights
  sessionGoal: number
  onSessionGoalChange: (value: number) => void
  progress: number
  onUsePrompt: (prompt: string) => void
}

export function InsightsPanel({
  insights,
  sessionGoal,
  onSessionGoalChange,
  progress,
  onUsePrompt,
}: Props) {
  const gapPrompts = [
    'Ask me questions to capture my life story in milestones.',
    'Help me define my values and non-negotiables.',
    'Interview me to learn my communication style and boundaries.',
  ]

  return (
    <section className="insights-panel" aria-label="Conversation insights">
      <div className="insight-grid">
        <article className="insight-card">
          <h3>Memory health</h3>
          <p className="insight-value">{insights.memoryHealthScore}/100</p>
        </article>
        <article className="insight-card">
          <h3>Total words</h3>
          <p className="insight-value">{insights.totalWords}</p>
        </article>
        <article className="insight-card">
          <h3>Message balance</h3>
          <p className="insight-value">
            {insights.userMessages} you / {insights.assistantMessages} persona
          </p>
        </article>
      </div>

      <div className="session-goal">
        <label htmlFor="goal-range">
          Session goal: <strong>{sessionGoal}</strong> user messages
        </label>
        <input
          id="goal-range"
          type="range"
          min={3}
          max={20}
          value={sessionGoal}
          onChange={(e) => onSessionGoalChange(Number(e.target.value))}
        />
        <div className="goal-progress">
          <div style={{ width: `${progress}%` }} />
        </div>
      </div>

      {insights.gaps.length > 0 && (
        <div className="gap-list">
          <h4>Improve persona quality</h4>
          <ul>
            {insights.gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <div className="gap-actions">
            {gapPrompts.map((p) => (
              <button key={p} type="button" className="suggestion-chip" onClick={() => onUsePrompt(p)}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
