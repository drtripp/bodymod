export default function MatchList({ matches }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Matches</h2>
        <p>Ranked by current scaffold distance score.</p>
      </div>

      <ul className="match-list">
        {matches.map((match) => (
          <li key={match.id} className="match-row">
            <span>{match.label}</span>
            <span>
              {typeof match.score === "number" ? match.score.toFixed(3) : "--"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
