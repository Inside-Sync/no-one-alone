export function Scene() {
  return (
    <div className="scene" aria-hidden="true">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: "var(--sky1)" }}/><stop offset=".5" style={{ stopColor: "var(--sky2)" }}/><stop offset=".72" style={{ stopColor: "var(--sky3)" }}/></linearGradient>
      <radialGradient id="sunG"><stop offset="0" style={{ stopColor: "var(--sun)" }}/><stop offset="1" style={{ stopColor: "var(--sun)", stopOpacity: "0" }}/></radialGradient>
      <radialGradient id="glowG" cx=".5" cy="1" r=".6"><stop offset="0" stopColor="#ff6a55" stopOpacity=".45"/><stop offset="1" stopColor="#ff6a55" stopOpacity="0"/></radialGradient>
      <linearGradient id="low" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: "var(--m4)" }}/><stop offset="1" style={{ stopColor: "var(--m5)" }}/></linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#sky)"/>
      <g fill="#fff" style={{ opacity: "var(--stars)" }}>
      <circle cx="80" cy="70" r="1.4"/><circle cx="220" cy="140" r="1"/><circle cx="360" cy="60" r="1.3"/><circle cx="520" cy="120" r="1"/><circle cx="640" cy="40" r="1.4"/><circle cx="760" cy="150" r="1"/><circle cx="880" cy="80" r="1.2"/><circle cx="990" cy="160" r=".9"/><circle cx="1180" cy="60" r="1.4"/><circle cx="1300" cy="130" r="1"/><circle cx="1400" cy="50" r="1.2"/><circle cx="440" cy="220" r="1"/>
      <circle cx="1210" cy="130" r="26" fill="#f5efe0"/><circle cx="1224" cy="120" r="23" style={{ fill: "var(--sky1)" }}/>
      </g>
      <circle cx="1180" cy="330" r="260" fill="url(#sunG)" style={{ opacity: "var(--sun-o)" }}/>
      <circle cx="1180" cy="330" r="60" style={{ fill: "var(--sun)", opacity: "var(--sun-o)" }}/>
      <g fill="#fff" style={{ opacity: "var(--cloud)" }}><ellipse cx="300" cy="190" rx="170" ry="24"/><ellipse cx="380" cy="172" rx="90" ry="28"/><ellipse cx="980" cy="240" rx="150" ry="18"/></g>
      <rect y="300" width="1440" height="600" fill="url(#glowG)" style={{ opacity: "var(--glow)" }}/>
      <path style={{ fill: "var(--m1)" }} d="M0 452 C160 420 300 410 460 430 C560 418 640 424 700 440 L700 470 L0 470Z"/>
      <g style={{ fill: "var(--city)" }}>
      <rect x="880" y="380" width="26" height="92"/><rect x="910" y="352" width="30" height="120"/><rect x="944" y="396" width="22" height="76"/><rect x="970" y="330" width="34" height="142"/><rect x="1008" y="372" width="24" height="100"/><rect x="1036" y="344" width="28" height="128"/><rect x="1068" y="400" width="30" height="72"/><rect x="1102" y="362" width="22" height="110"/><rect x="1128" y="410" width="34" height="62"/>
      <rect x="1052" y="250" width="4" height="100"/><ellipse cx="1054" cy="262" rx="11" ry="7"/>
      </g>
      <g fill="var(--win)" style={{ opacity: "var(--stars)" }}><rect x="916" y="370" width="3" height="3"/><rect x="926" y="390" width="3" height="3"/><rect x="978" y="350" width="3" height="3"/><rect x="990" y="380" width="3" height="3"/><rect x="1042" y="360" width="3" height="3"/><rect x="1050" y="400" width="3" height="3"/><rect x="1108" y="380" width="3" height="3"/><rect x="984" y="420" width="3" height="3"/></g>
      <g fill="none" style={{ stroke: "var(--city)" }} strokeWidth="5">
      <path d="M560 470 Q720 320 880 470"/><path d="M572 470 Q720 340 868 470" strokeWidth="2.5"/>
      <path d="M540 456 L900 456" strokeWidth="4"/>
      <path d="M620 456 V420 M660 456 V392 M700 456 V378 M740 456 V378 M780 456 V392 M820 456 V420" strokeWidth="1.6"/>
      </g>
      <g style={{ fill: "var(--city)" }}><rect x="540" y="430" width="22" height="42"/><rect x="878" y="430" width="22" height="42"/></g>
      <rect y="470" width="1440" height="70" style={{ fill: "var(--water)" }}/>
      <path style={{ fill: "var(--m2)" }} d="M0 520 C160 490 300 510 460 500 C560 494 600 506 680 512 L680 560 L0 560Z"/>
      <path style={{ fill: "var(--m3)" }} d="M0 580 C200 540 420 576 640 556 C860 536 1080 572 1440 540 V900 H0Z"/>
      <path fill="url(#low)" d="M0 690 C220 650 440 704 680 676 C900 650 1120 696 1440 664 V900 H0Z"/>
      <g style={{ opacity: "calc(var(--cloud) * 1.2)" }}><circle cx="160" cy="560" r="22" fill="#9b7fd4"/><circle cx="190" cy="552" r="16" fill="#a88ddc"/><circle cx="1290" cy="560" r="20" fill="#9b7fd4"/><circle cx="1320" cy="566" r="14" fill="#b39be0"/></g>
      </svg>
    </div>
  );
}
