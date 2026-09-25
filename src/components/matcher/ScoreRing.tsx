export function scoreTone(score: number) {
  if (score >= 75) return { ring: "#059669", text: "text-emerald-700", label: "Strong match" };
  if (score >= 50) return { ring: "#d97706", text: "text-amber-700", label: "Fair match" };
  return { ring: "#dc2626", text: "text-red-700", label: "Low match" };
}

export function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(score);
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Match score ${score} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth="8" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tone.ring}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 400ms ease" }}
        />
      </svg>
      <span className={`absolute inset-0 grid place-items-center text-2xl font-bold ${tone.text}`}>{score}%</span>
    </div>
  );
}
