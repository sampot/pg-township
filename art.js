/** 場景插畫（SVG）；行動裝置優先，純向量。 */

const BG = {
  harbor: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="舊碼頭">
    <rect width="640" height="360" fill="#0f1820"/>
    <rect y="220" width="640" height="140" fill="#1a3344"/>
    <path d="M0 220 Q160 180 320 210 T640 200 V360 H0Z" fill="#234"/>
    <rect x="80" y="140" width="18" height="90" fill="#5a4635"/>
    <rect x="200" y="120" width="18" height="110" fill="#5a4635"/>
    <rect x="340" y="150" width="18" height="80" fill="#5a4635"/>
    <circle cx="520" cy="90" r="36" fill="#ff8fab33"/>
    <text x="24" y="40" fill="#ff8fab" font-size="22" font-family="sans-serif">舊碼頭</text>
  </svg>`,
  market: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="早市">
    <rect width="640" height="360" fill="#1a1410"/>
    <rect y="240" width="640" height="120" fill="#2a2018"/>
    <rect x="40" y="180" width="120" height="70" fill="#8b4513" opacity=".8"/>
    <rect x="200" y="190" width="120" height="60" fill="#a0522d" opacity=".8"/>
    <rect x="360" y="175" width="120" height="75" fill="#8b4513" opacity=".8"/>
    <circle cx="500" cy="70" r="28" fill="#ffc97155"/>
    <text x="24" y="40" fill="#ffc971" font-size="22" font-family="sans-serif">早市</text>
  </svg>`,
  archive: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="鎮史館">
    <rect width="640" height="360" fill="#101820"/>
    <rect x="120" y="80" width="400" height="220" fill="#1c2830" stroke="#7ec8e3" stroke-width="2"/>
    <rect x="160" y="120" width="60" height="140" fill="#334"/>
    <rect x="240" y="120" width="60" height="140" fill="#334"/>
    <rect x="320" y="120" width="60" height="140" fill="#334"/>
    <rect x="400" y="120" width="60" height="140" fill="#334"/>
    <text x="24" y="40" fill="#7ec8e3" font-size="22" font-family="sans-serif">鎮史館</text>
  </svg>`,
  depot: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="貨運站">
    <rect width="640" height="360" fill="#141210"/>
    <rect x="60" y="200" width="520" height="8" fill="#444"/>
    <rect x="180" y="150" width="280" height="60" rx="8" fill="#ffc971" opacity=".35"/>
    <circle cx="220" cy="210" r="22" fill="#222" stroke="#666"/>
    <circle cx="420" cy="210" r="22" fill="#222" stroke="#666"/>
    <text x="24" y="40" fill="#ffc971" font-size="22" font-family="sans-serif">貨運站</text>
  </svg>`,
  evening: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="旅館窗景">
    <rect width="640" height="360" fill="#080a12"/>
    <circle cx="500" cy="80" r="40" fill="#fef3c755"/>
    <rect x="80" y="60" width="480" height="260" fill="#111822" stroke="#ffffff22"/>
    <line x1="320" y1="60" x2="320" y2="320" stroke="#ffffff15"/>
    <line x1="80" y1="190" x2="560" y2="190" stroke="#ffffff15"/>
    <text x="24" y="40" fill="#ff8fab" font-size="22" font-family="sans-serif">入夜 · 旅館</text>
  </svg>`,
};

export function sceneArt(place = "harbor") {
  return BG[place] ?? BG.harbor;
}

export function portraitArt(who) {
  const colors = { mira: "#ff8fab", ren: "#ffc971", yu: "#7ec8e3" };
  const letter = { mira: "美", ren: "任", yu: "雨" };
  const c = colors[who] ?? "#ccc";
  const t = letter[who] ?? "?";
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="60" cy="60" r="56" fill="${c}33" stroke="${c}" stroke-width="3"/>
    <text x="60" y="72" text-anchor="middle" fill="${c}" font-size="42" font-family="serif">${t}</text>
  </svg>`;
}
