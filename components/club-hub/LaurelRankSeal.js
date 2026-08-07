"use client";

/** Flat laurel wreath rank seal — gold / silver / bronze */

const PALETTE = {
  1: { stroke: "#c9a227", fill: "#e8c547", num: "#a67c00" },
  2: { stroke: "#8a9199", fill: "#b0b6bd", num: "#5c636a" },
  3: { stroke: "#b87333", fill: "#d4924a", num: "#8a4f1f" },
};

/**
 * @param {{ rank: 1 | 2 | 3, mirrored?: boolean, size?: "sm" | "md" }} props
 */
export default function LaurelRankSeal({ rank, size = "md" }) {
  const p = PALETTE[rank] || PALETTE[3];
  const sizeClass =
    size === "sm"
      ? "h-[36px] w-[36px] sm:h-[40px] sm:w-[40px]"
      : "h-[48px] w-[48px] sm:h-[52px] sm:w-[52px]";

  return (
    <svg
      viewBox="0 0 64 64"
      className={`${sizeClass} shrink-0`}
      aria-hidden
      fill="none"
    >
      {/* Left branch */}
      <path
        d="M32 52 C18 46 12 36 14 24 C15 16 20 12 26 14"
        stroke={p.stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Right branch */}
      <path
        d="M32 52 C46 46 52 36 50 24 C49 16 44 12 38 14"
        stroke={p.stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Left leaves */}
      <Leaf cx={22} cy={20} rot={-40} color={p.fill} stroke={p.stroke} />
      <Leaf cx={17} cy={28} rot={-18} color={p.fill} stroke={p.stroke} />
      <Leaf cx={16} cy={36} rot={5} color={p.fill} stroke={p.stroke} />
      <Leaf cx={18} cy={43} rot={28} color={p.fill} stroke={p.stroke} />
      {/* Right leaves */}
      <Leaf cx={42} cy={20} rot={40} color={p.fill} stroke={p.stroke} />
      <Leaf cx={47} cy={28} rot={18} color={p.fill} stroke={p.stroke} />
      <Leaf cx={48} cy={36} rot={-5} color={p.fill} stroke={p.stroke} />
      <Leaf cx={46} cy={43} rot={-28} color={p.fill} stroke={p.stroke} />

      {/* Center number */}
      <text
        x="32"
        y="36"
        textAnchor="middle"
        fontSize="20"
        fontWeight={700}
        fill={p.num}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {rank}
      </text>

      {/* Star at base */}
      <path
        d="M32 54.5 L33.1 57.2 L36.1 57.4 L33.8 59.3 L34.5 62.2 L32 60.6 L29.5 62.2 L30.2 59.3 L27.9 57.4 L30.9 57.2 Z"
        fill={p.fill}
        stroke={p.stroke}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Leaf({ cx, cy, rot, color, stroke }) {
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx="3.2"
      ry="6.2"
      fill={color}
      stroke={stroke}
      strokeWidth="0.7"
      transform={`rotate(${rot} ${cx} ${cy})`}
    />
  );
}
