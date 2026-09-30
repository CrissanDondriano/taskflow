const N: [number, number, "b" | "t" | "r"][] = [
  [120, 140, "b"], [300, 80, "t"], [260, 260, "b"], [470, 170, "t"], [640, 70, "b"], [760, 230, "r"], [940, 110, "t"],
  [1080, 250, "b"], [880, 400, "t"], [560, 380, "b"], [360, 440, "t"], [130, 420, "b"], [1120, 470, "t"],
];
const E: [number, number][] = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6], [5, 7], [5, 8], [7, 8], [3, 9], [9, 10], [2, 10], [10, 11], [9, 8], [8, 12], [7, 12]];
const C = { b: "#3B82F6", t: "#2DD4BF", r: "#F87171" };

/** A task-dependency map: tasks as nodes, dependencies as lines, one node at risk. Decorative. */
export function HeroBackdrop({ dim = false }: { dim?: boolean }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 1200 560" preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: dim ? 0.35 : 0.6, WebkitMaskImage: "linear-gradient(to bottom,#000 55%,transparent)", maskImage: "linear-gradient(to bottom,#000 55%,transparent)" }}>
      <g stroke="#60A5FA" strokeOpacity="0.28" strokeWidth="1.2" fill="none">
        {E.map(([a, b], i) => <line key={i} className="edge" pathLength={1} x1={N[a][0]} y1={N[a][1]} x2={N[b][0]} y2={N[b][1]} style={{ animationDelay: `${i * 90}ms` }} />)}
      </g>
      {N.map(([x, y, t], i) => (
        <g key={i}>
          {t === "r" && <circle className="ring" cx={x} cy={y} r="7" fill="none" stroke={C.r} strokeWidth="1.5" />}
          <circle className="node" cx={x} cy={y} r={t === "r" ? 6 : 4.5} fill={C[t]} style={{ animationDelay: `${(i % 6) * 500}ms` }} />
        </g>
      ))}
    </svg>
  );
}