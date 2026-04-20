export default function StatusCard({ title, value, tone = "neutral", detail }) {
  return (
    <div className={`status-card status-card--${tone}`}>
      <p className="eyebrow">{title}</p>
      <h3>{value}</h3>
      {detail ? <p className="status-card__detail">{detail}</p> : null}
    </div>
  );
}