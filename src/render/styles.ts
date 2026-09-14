export function pageStyles(density: "comfortable" | "compact"): string {
  const pad = density === "compact" ? "16px" : "26px"
  const gap = density === "compact" ? "12px" : "20px"
  return `
:root {
  --text: rgba(255,255,255,.80); --muted: rgba(255,255,255,.55); --faint: rgba(255,255,255,.42);
  --label: rgba(255,255,255,.70);
  --glass: rgba(255,255,255,.095); --glass-2: rgba(255,255,255,.058);
  --glass-hi: rgba(255,255,255,.13);
  --shell: rgba(255,255,255,.06);
  --well: rgba(0,0,0,.20);
  --well-border: rgba(255,255,255,.07);
  --control: rgba(255,255,255,.062);
  --control-hover: rgba(255,255,255,.092);
  --border: rgba(255,255,255,.12); --border-strong: rgba(255,255,255,.22);
  --control-border: rgba(255,255,255,.36);
  --shadow: 0 18px 56px rgba(0,0,0,.55), 0 2px 10px rgba(0,0,0,.38), 0 0 0 1px rgba(255,255,255,.04);
  --inset-hi: inset 0 1px 0 rgba(255,255,255,.08);
  --accent: #8b93ff; --accent-2: #45c8ff;
  --accent-grad: linear-gradient(135deg, #8b93ff 0%, #6366f1 48%, #38bdf8 100%);
  --accent-soft: rgba(129,140,248,.16); --accent-glow: rgba(99,102,241,.38);
  --sel-fill: #1e2148;
  --danger: #ff7d92; --danger-soft: rgba(244,63,94,.14);
  --success: #3ce0a7; --success-soft: rgba(16,185,129,.13);
  --warn: #ffc757; --warn-soft: rgba(255,199,87,.10);
  --info-soft: rgba(56,189,248,.10);
  --radius: 16px; --radius-sm: 12px; --radius-xs: 8px;
  --pad: ${pad}; --gap: ${gap};
  --font: "Inter", "SF Pro Text", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color-scheme: dark;
}
@media (prefers-color-scheme: light) {
  :root {
    --text: #1c1c1f; --muted: rgba(24,24,27,.60); --faint: rgba(24,24,27,.42);
    --label: rgba(24,24,27,.72);
    --glass: rgba(255,255,255,.68); --glass-2: rgba(255,255,255,.42);
    --glass-hi: rgba(255,255,255,.8);
    --shell: rgba(255,255,255,.68);
    --well: rgba(20,26,45,.04);
    --well-border: rgba(20,26,45,.08);
    --control: rgba(255,255,255,.92);
    --control-hover: rgba(255,255,255,1);
    --border: rgba(20,26,45,.10); --border-strong: rgba(20,26,45,.20);
    --control-border: rgba(20,26,45,.22);
    --shadow: 0 18px 56px rgba(0,0,0,.14), 0 2px 10px rgba(0,0,0,.07);
    --inset-hi: inset 0 1px 0 rgba(255,255,255,.7);
    --accent: #5157d8; --accent-2: #0284c7;
    --accent-grad: linear-gradient(135deg, #6d72f6 0%, #5458e8 48%, #0ea5e9 100%);
    --accent-soft: rgba(99,102,241,.12); --accent-glow: rgba(99,102,241,.25);
    --sel-fill: #edecfc;
    --danger: #dc2626; --danger-soft: rgba(220,38,38,.10);
    --success: #059669; --success-soft: rgba(5,150,105,.10);
    --warn: #b45309; --warn-soft: rgba(180,83,9,.10);
    --info-soft: rgba(2,132,199,.08);
    color-scheme: light;
  }
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; min-height: 100vh; color: var(--text);
  font-family: var(--font); font-size: 16px; line-height: 1.55;
  background: #0a0a0c;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  font-feature-settings: "ss01" on, "cv01" on;
}
@media (prefers-color-scheme: light) { body { background: #f2f2f3; } }

@keyframes rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}

.bg {
  position: fixed; inset: 0; z-index: -1; overflow: hidden;
  background: linear-gradient(180deg, #0a0a0c 0%, #121214 100%);
}
.bg::before {
  content: ""; position: absolute; inset: 0; opacity: .03;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}
.bg::after {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(120% 90% at 50% 28%, transparent 55%, rgba(0,0,0,.34) 100%);
}
@media (prefers-color-scheme: light) {
  .bg { background: linear-gradient(180deg, #f4f4f5 0%, #ebebed 100%); }
  .bg::before { opacity: .02; }
  .bg::after { background: radial-gradient(120% 90% at 50% 28%, transparent 60%, rgba(0,0,0,.05) 100%); }
}
/* Background themes: monochrome texture over the base gradient.
   Selected per-install via the theme setting (minimal | starfield | dots | contour). */
.bg-stars, .bg-stars-bright { display: none; position: fixed; top: 0; left: 0; border-radius: 50%; pointer-events: none; }
.bg-stars { width: 1px; height: 1px; }
.bg-stars-bright { width: 2px; height: 2px; }
@keyframes twinkle-a { from { opacity: .55; } to { opacity: 1; } }
@keyframes twinkle-b { from { opacity: 1; } to { opacity: .6; } }

body[data-motion="still"] .bg-stars, body[data-motion="still"] .bg-stars-bright { animation-name: none; }
@keyframes stardrift { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(-34px, 18px, 0); } }
.bg-shoot { display: none; position: fixed; top: 0; left: 0; width: 150px; height: 2px; border-radius: 2px; pointer-events: none;
  background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.75)); }
body[data-theme="starfield"] .bg-shoot { display: block; animation: shoot 12s linear infinite; }
@keyframes shoot {
  0% { transform: translate(108vw, -6vh) rotate(-32deg); opacity: 0; }
  1% { opacity: 1; }
  7% { transform: translate(56vw, 44vh) rotate(-32deg); opacity: 0; }
  100% { transform: translate(56vw, 44vh) rotate(-32deg); opacity: 0; }
}
@media (prefers-color-scheme: light) {
  body[data-theme="starfield"] .bg-shoot { background: linear-gradient(90deg, rgba(20,26,45,0), rgba(20,26,45,.6)); }
}
body[data-theme="starfield"] .bg-stars { display: block;
  animation: twinkle-a 7s ease-in-out infinite alternate;
}
body[data-theme="starfield"] .bg-stars-bright { display: block;
  animation: twinkle-b 9s ease-in-out infinite alternate, stardrift 46s ease-in-out infinite alternate;
}
body[data-theme="dots"] .bg {
  background-image: radial-gradient(circle, rgba(255,255,255,.12) 1px, transparent 1.4px), linear-gradient(180deg, #0a0a0c 0%, #121214 100%);
  background-size: 26px 26px, cover;
  background-position: 0 0, center;
  animation: dotdrift 14s linear infinite, dotbreathe 6s ease-in-out infinite alternate;
}
@keyframes dotdrift { to { background-position: 26px 26px, center; } }
@keyframes dotbreathe { from { opacity: .82; } to { opacity: 1; } }
body[data-theme="contour"] .bg {
  background-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22800%22%20viewBox%3D%220%200%201200%20800%22%3E%3Cpath%20d%3D%22M540%2C350L549%2C374L547%2C398L532%2C418L510%2C430L489%2C438L470%2C445L450%2C453L430%2C456L410%2C453L390%2C445L371%2C438L350%2C430L328%2C418L313%2C398L311%2C374L320%2C350L333%2C331L343%2C314L349%2C296L354%2C274L366%2C255L385%2C242L407%2C237L430%2C236L453%2C237L475%2C242L494%2C255L506%2C274L511%2C296L517%2C314L527%2C331Z%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%221.5%22%20opacity%3D%220.12%22%2F%3E%3Cpath%20d%3D%22M643%2C350L640%2C392L617%2C428L586%2C454L556%2C476L529%2C498L499%2C516L465%2C526L430%2C527L396%2C523L359%2C520L319%2C516L279%2C501L251%2C469L244%2C427L254%2C385L267%2C350L271%2C318L270%2C284L273%2C245L290%2C210L320%2C185L355%2C169L392%2C158L430%2C151L469%2C154L503%2C173L528%2C203L545%2C235L564%2C260L592%2C283L623%2C312Z%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%221.5%22%20opacity%3D%220.12%22%2F%3E%3Cpath%20d%3D%22M728%2C350L703%2C404L670%2C449L639%2C490L609%2C529L572%2C562L527%2C583L478%2C593L430%2C602L378%2C613L318%2C619L260%2C604L219%2C561L203%2C502L205%2C443L206%2C394L196%2C350L181%2C300L178%2C246L197%2C194L233%2C153L276%2C120L323%2C92L375%2C71L430%2C70L481%2C92L522%2C128L556%2C162L595%2C185L646%2C206L697%2C240L728%2C291Z%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%221.5%22%20opacity%3D%220.12%22%2F%3E%3Cpath%20d%3D%22M779%2C350L754%2C415L732%2C475L705%2C533L663%2C583L609%2C618L552%2C645L495%2C675L430%2C709L354%2C730L279%2C716L222%2C662L192%2C588L177%2C519L157%2C463L124%2C411L91%2C350L80%2C280L96%2C212L133%2C151L177%2C97L227%2C46L289%2C10L360%2C0L430%2C21L489%2C55L542%2C80L604%2C90L678%2C102L749%2C137L793%2C200L799%2C277Z%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%221.5%22%20opacity%3D%220.12%22%2F%3E%3Cpath%20d%3D%22M834%2C350L826%2C429L805%2C506L763%2C573L707%2C627L649%2C677L590%2C736L519%2C797L430%2C834L336%2C821L260%2C759L210%2C679L172%2C608L124%2C555L64%2C502L12%2C433L-10%2C350L-2%2C264L26%2C183L61%2C104L110%2C30L180%2C-24L267%2C-43L354%2C-31L430%2C-10L501%2C-7L583%2C-20L679%2C-23L769%2C11L825%2C86L844%2C179L840%2C268Z%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%221.5%22%20opacity%3D%220.12%22%2F%3E%3Cpath%20d%3D%22M1040%2C520L1039%2C544L1027%2C564L1007%2C578L987%2C587L972%2C597L958%2C612L942%2C630L920%2C641L896%2C641L875%2C629L858%2C613L843%2C597L830%2C580L820%2C561L817%2C540L820%2C520L823%2C501L824%2C480L824%2C456L832%2C432L849%2C414L874%2C409L899%2C414L920%2C421L939%2C425L959%2C426L980%2C431L998%2C442L1013%2C458L1023%2C477L1033%2C497Z%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%221.5%22%20opacity%3D%220.1%22%2F%3E%3Cpath%20d%3D%22M1125%2C520L1107%2C557L1079%2C586L1052%2C608L1034%2C634L1019%2C669L996%2C703L961%2C726L920%2C728L881%2C714L847%2C695L816%2C675L788%2C652L768%2C622L758%2C587L755%2C553L749%2C520L739%2C484L731%2C442L739%2C399L769%2C369L810%2C356L852%2C356L888%2C357L920%2C352L955%2C345L991%2C348L1025%2C363L1054%2C386L1080%2C413L1105%2C443L1124%2C479Z%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%221.5%22%20opacity%3D%220.1%22%2F%3E%3Cpath%20d%3D%22M1180%2C520L1149%2C566L1127%2C606L1117%2C652L1107%2C707L1080%2C760L1034%2C794L976%2C803L920%2C795L868%2C781L819%2C765L774%2C739L740%2C700L718%2C655L701%2C611L678%2C568L648%2C520L627%2C462L635%2C402L674%2C356L731%2C331L785%2C318L830%2C303L872%2C281L920%2C263L972%2C260L1022%2C273L1069%2C297L1116%2C324L1161%2C359L1193%2C407L1199%2C464Z%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%221.5%22%20opacity%3D%220.1%22%2F%3E%3Cpath%20d%3D%22M1213%2C520L1207%2C577L1215%2C642L1216%2C718L1188%2C788L1131%2C836L1060%2C858L988%2C864L920%2C864L853%2C857L791%2C833L740%2C789L702%2C738L664%2C691L615%2C646L560%2C592L525%2C520L532%2C443L579%2C379L644%2C335L702%2C302L749%2C264L797%2C222L854%2C189L920%2C176L987%2C183L1054%2C197L1123%2C217L1189%2C251L1236%2C309L1250%2C383L1235%2C457Z%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%221.5%22%20opacity%3D%220.1%22%2F%3E%3C%2Fsvg%3E"), linear-gradient(180deg, #0a0a0c 0%, #121214 100%);
  background-size: cover, cover;
  background-position: center, center;
}
@media (prefers-color-scheme: light) {
  /* (light-mode star colors are chosen at runtime; see client initStars) */
  /* (light-mode star colors are chosen at runtime; see client initStars) */
  body[data-theme="dots"] .bg {
    background-image: radial-gradient(circle, rgba(20,26,45,.13) 1px, transparent 1.4px), linear-gradient(180deg, #f4f4f5 0%, #ebebed 100%);
    background-size: 26px 26px, cover;
    background-position: 0 0, center;
    animation: dotdrift 14s linear infinite, dotbreathe 6s ease-in-out infinite alternate;
  }
  body[data-theme="contour"] .bg {
    background-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22800%22%20viewBox%3D%220%200%201200%20800%22%3E%3Cpath%20d%3D%22M540%2C350L549%2C374L547%2C398L532%2C418L510%2C430L489%2C438L470%2C445L450%2C453L430%2C456L410%2C453L390%2C445L371%2C438L350%2C430L328%2C418L313%2C398L311%2C374L320%2C350L333%2C331L343%2C314L349%2C296L354%2C274L366%2C255L385%2C242L407%2C237L430%2C236L453%2C237L475%2C242L494%2C255L506%2C274L511%2C296L517%2C314L527%2C331Z%22%20fill%3D%22none%22%20stroke%3D%22%2314182d%22%20stroke-width%3D%221.5%22%20opacity%3D%220.11%22%2F%3E%3Cpath%20d%3D%22M643%2C350L640%2C392L617%2C428L586%2C454L556%2C476L529%2C498L499%2C516L465%2C526L430%2C527L396%2C523L359%2C520L319%2C516L279%2C501L251%2C469L244%2C427L254%2C385L267%2C350L271%2C318L270%2C284L273%2C245L290%2C210L320%2C185L355%2C169L392%2C158L430%2C151L469%2C154L503%2C173L528%2C203L545%2C235L564%2C260L592%2C283L623%2C312Z%22%20fill%3D%22none%22%20stroke%3D%22%2314182d%22%20stroke-width%3D%221.5%22%20opacity%3D%220.11%22%2F%3E%3Cpath%20d%3D%22M728%2C350L703%2C404L670%2C449L639%2C490L609%2C529L572%2C562L527%2C583L478%2C593L430%2C602L378%2C613L318%2C619L260%2C604L219%2C561L203%2C502L205%2C443L206%2C394L196%2C350L181%2C300L178%2C246L197%2C194L233%2C153L276%2C120L323%2C92L375%2C71L430%2C70L481%2C92L522%2C128L556%2C162L595%2C185L646%2C206L697%2C240L728%2C291Z%22%20fill%3D%22none%22%20stroke%3D%22%2314182d%22%20stroke-width%3D%221.5%22%20opacity%3D%220.11%22%2F%3E%3Cpath%20d%3D%22M779%2C350L754%2C415L732%2C475L705%2C533L663%2C583L609%2C618L552%2C645L495%2C675L430%2C709L354%2C730L279%2C716L222%2C662L192%2C588L177%2C519L157%2C463L124%2C411L91%2C350L80%2C280L96%2C212L133%2C151L177%2C97L227%2C46L289%2C10L360%2C0L430%2C21L489%2C55L542%2C80L604%2C90L678%2C102L749%2C137L793%2C200L799%2C277Z%22%20fill%3D%22none%22%20stroke%3D%22%2314182d%22%20stroke-width%3D%221.5%22%20opacity%3D%220.11%22%2F%3E%3Cpath%20d%3D%22M834%2C350L826%2C429L805%2C506L763%2C573L707%2C627L649%2C677L590%2C736L519%2C797L430%2C834L336%2C821L260%2C759L210%2C679L172%2C608L124%2C555L64%2C502L12%2C433L-10%2C350L-2%2C264L26%2C183L61%2C104L110%2C30L180%2C-24L267%2C-43L354%2C-31L430%2C-10L501%2C-7L583%2C-20L679%2C-23L769%2C11L825%2C86L844%2C179L840%2C268Z%22%20fill%3D%22none%22%20stroke%3D%22%2314182d%22%20stroke-width%3D%221.5%22%20opacity%3D%220.11%22%2F%3E%3Cpath%20d%3D%22M1040%2C520L1039%2C544L1027%2C564L1007%2C578L987%2C587L972%2C597L958%2C612L942%2C630L920%2C641L896%2C641L875%2C629L858%2C613L843%2C597L830%2C580L820%2C561L817%2C540L820%2C520L823%2C501L824%2C480L824%2C456L832%2C432L849%2C414L874%2C409L899%2C414L920%2C421L939%2C425L959%2C426L980%2C431L998%2C442L1013%2C458L1023%2C477L1033%2C497Z%22%20fill%3D%22none%22%20stroke%3D%22%2314182d%22%20stroke-width%3D%221.5%22%20opacity%3D%220.09%22%2F%3E%3Cpath%20d%3D%22M1125%2C520L1107%2C557L1079%2C586L1052%2C608L1034%2C634L1019%2C669L996%2C703L961%2C726L920%2C728L881%2C714L847%2C695L816%2C675L788%2C652L768%2C622L758%2C587L755%2C553L749%2C520L739%2C484L731%2C442L739%2C399L769%2C369L810%2C356L852%2C356L888%2C357L920%2C352L955%2C345L991%2C348L1025%2C363L1054%2C386L1080%2C413L1105%2C443L1124%2C479Z%22%20fill%3D%22none%22%20stroke%3D%22%2314182d%22%20stroke-width%3D%221.5%22%20opacity%3D%220.09%22%2F%3E%3Cpath%20d%3D%22M1180%2C520L1149%2C566L1127%2C606L1117%2C652L1107%2C707L1080%2C760L1034%2C794L976%2C803L920%2C795L868%2C781L819%2C765L774%2C739L740%2C700L718%2C655L701%2C611L678%2C568L648%2C520L627%2C462L635%2C402L674%2C356L731%2C331L785%2C318L830%2C303L872%2C281L920%2C263L972%2C260L1022%2C273L1069%2C297L1116%2C324L1161%2C359L1193%2C407L1199%2C464Z%22%20fill%3D%22none%22%20stroke%3D%22%2314182d%22%20stroke-width%3D%221.5%22%20opacity%3D%220.09%22%2F%3E%3Cpath%20d%3D%22M1213%2C520L1207%2C577L1215%2C642L1216%2C718L1188%2C788L1131%2C836L1060%2C858L988%2C864L920%2C864L853%2C857L791%2C833L740%2C789L702%2C738L664%2C691L615%2C646L560%2C592L525%2C520L532%2C443L579%2C379L644%2C335L702%2C302L749%2C264L797%2C222L854%2C189L920%2C176L987%2C183L1054%2C197L1123%2C217L1189%2C251L1236%2C309L1250%2C383L1235%2C457Z%22%20fill%3D%22none%22%20stroke%3D%22%2314182d%22%20stroke-width%3D%221.5%22%20opacity%3D%220.09%22%2F%3E%3C%2Fsvg%3E"), linear-gradient(180deg, #f4f4f5 0%, #ebebed 100%);
    background-size: cover, cover;
    background-position: center, center;
  }
}
/* Motion levels: full (default) > subtle (twinkle only) > still (static; also forced by prefers-reduced-motion) */
body[data-motion="subtle"] .bg-shoot, body[data-motion="still"] .bg-shoot { display: none; }
body[data-motion="subtle"] .bg-stars-bright { animation-name: twinkle-b; }
body[data-motion="subtle"] .bg, body[data-motion="still"] .bg { animation-name: none; }
.wrap {
  max-width: 880px; margin: 0 auto; padding: clamp(18px, 4vw, 42px) 18px 76px;
  min-height: 100svh; display: flex; flex-direction: column; justify-content: center;
}
.brand {
  display: flex; align-items: center; gap: 9px; margin: 0 6px 16px;
  font-size: 12px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase;
  color: var(--muted);
}
.brand .dot {
  width: 10px; height: 10px; border-radius: 4px; background: var(--accent-grad);
  box-shadow: 0 0 14px var(--accent-glow);
}
.brand .sep { color: var(--border-strong); font-weight: 400; }

.card {
  position: relative;
  background: var(--shell);
  -webkit-backdrop-filter: blur(22px) saturate(1.4);
  backdrop-filter: blur(22px) saturate(1.4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--pad) calc(var(--pad) + 8px);
  box-shadow: var(--shadow), var(--inset-hi);
  animation: rise .5s cubic-bezier(.16,.8,.3,1) both;
}
.card::before {
  content: ""; position: absolute; inset: 0 0 auto 0; height: 1px;
  border-radius: var(--radius) var(--radius) 0 0;
  background: linear-gradient(90deg, transparent 4%, rgba(255,255,255,.18) 50%, transparent 96%);
  pointer-events: none;
}
@media (prefers-color-scheme: light) {
  .card::before { background: linear-gradient(90deg, transparent 4%, rgba(255,255,255,.7) 50%, transparent 96%); }
}

h1 {
  color: #f4f4f5;
  font-size: clamp(1.7rem, 1.1rem + 2.4vw, 2.3rem); font-weight: 700; letter-spacing: -.022em;
  line-height: 1.15; margin: 0 0 8px; text-wrap: balance;
}
@media (prefers-color-scheme: light) { h1 { color: #18181b; } }
.subtitle { color: var(--muted); margin: 0 0 30px; font-size: .95rem; line-height: 1.55; }

/* Eyebrow: what kind of answer is needed, above the title */
.eyebrow {
  display: flex; align-items: center; gap: 8px; margin: 0 0 12px;
  font-size: .72rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
  color: var(--accent);
}
.eyebrow-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--accent);
  box-shadow: 0 0 12px var(--accent-glow);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse { 50% { opacity: .45; } }

.blocks > :first-child { margin-top: 0; }
.blocks > :last-child { margin-bottom: 0; }
.blocks > * + * { margin-top: calc(var(--gap) * .9); }
.blocks h2, .blocks h3, .blocks h4 { letter-spacing: -.012em; }
.blocks h2 { font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--faint); margin: 30px 0 10px; }
.blocks h3 { font-size: .875rem; font-weight: 600; letter-spacing: -.008em; color: var(--text); margin: 24px 0 8px; }
.blocks h4 { font-size: .8125rem; font-weight: 600; color: var(--muted); margin: 20px 0 6px; }
.blocks h2:first-child, .blocks h3:first-child, .blocks h4:first-child,
.blocks > :first-child:is(h2,h3,h4) { margin-top: 0; }
.blocks > :first-child { margin-top: 0; }
/* keep tighter rhythm for paragraphs/code vs headings handled above */
.blocks p { margin: 0; color: var(--text); line-height: 1.6; max-width: 68ch; }
.md p + p { margin-top: 11px; }
.blocks strong { font-weight: 600; }
.blocks pre {
  background: rgba(0,0,0,.28); border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 16px 18px; overflow-x: auto; font-size: 13.5px; line-height: 1.6;
  font-variant-ligatures: none;
  box-shadow: var(--inset-hi);
}
@media (prefers-color-scheme: light) { .blocks pre { background: rgba(255,255,255,.55); } }
.blocks code { font-family: var(--mono); font-size: 13px; font-weight: 500; color: var(--accent); padding: .14em .45em; border-radius: 6px; background: var(--accent-soft); border: 1px solid var(--border); font-variant-ligatures: none; }
.blocks pre code { padding: 0; background: none; border: 0; font-size: 1em; color: var(--text); font-weight: 400; }
.blocks ul { margin: 0; padding-left: 4px; list-style: none; }
.blocks ul li { position: relative; padding-left: 21px; margin-top: 7px; line-height: 1.55; max-width: 68ch; }
.blocks ul li::before {
  content: ""; position: absolute; left: 2px; top: .6em;
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(255,255,255,.30);
}
@media (prefers-color-scheme: light) { .blocks ul li::before { background: rgba(24,24,27,.25); } }
.blocks ol { margin: 0; padding-left: 22px; }
.blocks ol li { margin-top: 7px; line-height: 1.55; max-width: 68ch; }
.blocks ol li::marker { color: var(--faint); font-weight: 600; }
.blocks a { color: var(--accent-2); text-decoration: none; border-bottom: 1px solid transparent; }
.blocks a:hover { border-bottom-color: var(--accent-2); }
.blocks blockquote {
  margin: 0; padding: 10px 16px; border-left: 2px solid var(--accent);
  background: var(--accent-soft); border-radius: 0 var(--radius-xs) var(--radius-xs) 0; color: var(--muted);
}
.blocks hr { border: 0; height: 1px; margin: 28px 0;
  background: linear-gradient(90deg, transparent, var(--border-strong), transparent); }

/* Callouts: accent spine on the left — deliberately unlike choice cards */
.callout {
  border: 1px solid var(--border); border-left: 3px solid var(--accent-2);
  border-radius: 6px var(--radius-sm) var(--radius-sm) 6px;
  padding: 13px 17px; background: var(--info-soft);
  font-size: .95em; line-height: 1.6; color: var(--muted);
}
.callout.warn { border-left-color: var(--warn); background: var(--warn-soft); }
.callout.success { border-left-color: var(--success); background: var(--success-soft); }

.steps { margin: 0; padding-left: 0; list-style: none; counter-reset: step; }
.steps li { counter-increment: step; padding: 6px 0 6px 42px; position: relative; line-height: 1.55; }
.steps li + li { margin-top: 3px; }
.steps li::before {
  content: counter(step); position: absolute; left: 0; top: 5px;
  width: 27px; height: 27px; border-radius: 9px;
  background: var(--accent-soft); color: var(--accent);
  border: 1px solid var(--border);
  font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center;
}

.table-scroll { overflow-x: auto; border: 1px solid var(--well-border); border-radius: var(--radius-sm); background: var(--well); box-shadow: inset 0 1px 0 rgba(255,255,255,.03); }
table { width: 100%; border-collapse: collapse; font-size: .93em; }
th, td { text-align: left; padding: 10px 15px; border-bottom: 1px solid var(--border); line-height: 1.5; }
tr:last-child td { border-bottom: 0; }
th { color: var(--faint); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
  border-bottom: 1px solid var(--border-strong); background: rgba(255,255,255,.04); }
@media (prefers-color-scheme: light) { th { background: rgba(20,26,45,.04); } }
tbody tr { transition: background .15s ease; }
tbody tr:hover { background: var(--glass-hi); }

.option-card {
  border: 1px solid var(--well-border); border-radius: var(--radius-sm);
  padding: 13px 16px; background: var(--well);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.03);
}
.option-card .meta { margin-left: 2px; }

/* Diff block: unified view, per-line tints, file header with +/- counts */
.diff-block {
  border: 1px solid var(--well-border); border-radius: var(--radius-sm);
  background: var(--well); overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.03);
}
.diff-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 8px 14px; border-bottom: 1px solid var(--well-border);
  font-size: .8em; color: var(--muted); background: rgba(255,255,255,.03);
}
@media (prefers-color-scheme: light) { .diff-head { background: rgba(20,26,45,.03); } }
.diff-head code { color: var(--accent); font-size: 12px; background: none; border: 0; padding: 0; overflow-wrap: anywhere; }
.diff-stats { flex: none; font-variant-numeric: tabular-nums; }
.diff-stats em { font-style: normal; font-weight: 600; }
.diff-stats .add { color: var(--success); }
.diff-stats .del { color: var(--danger); }
.diff-body {
  display: block; overflow-x: auto; padding: 9px 0;
  font-family: var(--mono); font-size: 12px; line-height: 1.65;
  font-variant-ligatures: none;
}
.dl { display: block; padding: 0 14px; white-space: pre; color: var(--text); min-height: 1.65em; }
.dl.add { color: var(--success); background: var(--success-soft); }
.dl.del { color: var(--danger); background: var(--danger-soft); }
.dl.hunk { color: var(--accent-2); background: var(--info-soft); }
.dl.meta { color: var(--faint); }

/* Settle view: what was answered, shown after submit instead of slamming shut */
.settle {
  margin-top: 24px; padding: 18px 20px;
  border: 1px solid rgba(16,185,129,.4); border-radius: var(--radius-sm);
  background: var(--success-soft);
}
.settle h2 {
  margin: 0 0 6px; font-size: .95rem; font-weight: 650; color: var(--success);
  display: flex; align-items: center; gap: 8px;
}
.settle h2::before {
  content: ""; flex: none; width: 18px; height: 18px; border-radius: 50%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='10' fill='%2310b981'/%3E%3Cpath d='M5.5 10.5l3 3 6-7' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E");
  background-size: 100% 100%;
}
.settle-summary { margin: 0; color: var(--text); line-height: 1.55; overflow-wrap: anywhere; }
.settle-link { margin: 10px 0 0; font-size: .78em; color: var(--muted); }
.settle-link code { display: block; margin-top: 4px; padding: 6px 10px; font-size: 11px; color: var(--muted); background: var(--well); border: 1px solid var(--well-border); border-radius: var(--radius-xs); overflow-wrap: anywhere; white-space: nowrap; overflow-x: auto; }
.permalink-row { display: flex; gap: 8px; align-items: stretch; margin-top: 6px; }
.permalink-row code { flex: 1; margin-top: 0 !important; min-width: 0; }
.permalink-row .btn-sm { flex: none; align-self: center; }
.btn-sm { padding: 6px 14px; font-size: .78rem; min-width: 0; border-radius: 8px; }
.settle-actions { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
.settle-countdown { display: flex; align-items: center; gap: 10px; margin: 12px 0 0; font-size: .82rem; color: var(--muted); }
.settle-countdown[hidden] { display: none; }
.settle-countdown b { color: var(--text); font-variant-numeric: tabular-nums; }
.countdown-track { flex: 1; height: 4px; border-radius: 999px; background: var(--well); border: 1px solid var(--well-border); overflow: hidden; min-width: 80px; }
.countdown-fill { display: block; height: 100%; width: 100%; border-radius: 999px; background: var(--accent-grad); transition: width .1s linear; }
.settle .btn-secondary { margin-top: 0; }
.settle.err { border-color: rgba(244,63,94,.45); background: var(--danger-soft); }
.settle.err h2 { color: var(--danger); }
.settle.err h2::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='10' fill='%23f43f5e'/%3E%3Cpath d='M7 7l6 6M13 7l-6 6' stroke='white' stroke-width='2' stroke-linecap='round' fill='none'/%3E%3C/svg%3E");
}

/* Choice cards: the interactive core — tighter between related rows */
.choice-list { display: flex; flex-direction: column; gap: 12px; counter-reset: choice; }
@media (min-width: 760px) {
  .choice-list.choice-grid { display: grid; grid-template-columns: 1fr 1fr; align-items: stretch; }
  .choice-list.choice-grid .choice-other { grid-column: 1 / -1; }
}
.choice {
  position: relative;
  display: flex; gap: 15px; align-items: flex-start; padding: 18px 21px;
  border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer;
  background: var(--control); box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 1px 2px rgba(0,0,0,.14);
  transition: border-color .18s ease, background .18s ease, transform .18s ease, box-shadow .18s ease;
  animation: rise .45s cubic-bezier(.16,.8,.3,1) both;
}
.choice-list .choice:nth-child(1) { animation-delay: .04s; }
.choice-list .choice:nth-child(2) { animation-delay: .08s; }
.choice-list .choice:nth-child(3) { animation-delay: .12s; }
.choice-list .choice:nth-child(4) { animation-delay: .16s; }
.choice-list .choice:nth-child(5) { animation-delay: .2s; }
.choice-list .choice:nth-child(6) { animation-delay: .24s; }
.choice-list .choice:nth-child(n+7) { animation-delay: .28s; }
.choice:hover { border-color: var(--border-strong); background: var(--control-hover); transform: translateY(-1px); box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 4px 14px rgba(0,0,0,.18); }
.choice:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
/* Native input is visually hidden — the number badge is the affordance */
.choice input {
  position: absolute; opacity: 0; pointer-events: none;
  width: 1px; height: 1px; margin: 0;
}
.choice .choice-title { font-weight: 650; font-size: 1.06rem; display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px 10px; letter-spacing: -.01em; }
.choice-meta {
  padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; letter-spacing: .02em;
  background: var(--accent-soft); color: var(--accent); border: 1px solid rgba(129,140,248,.35);
}
.choice-meta.success { background: var(--success-soft); color: var(--success); border-color: rgba(16,185,129,.30); }
.choice-meta.warn { background: var(--warn-soft); color: var(--warn); border-color: rgba(255,199,87,.30); }
@media (prefers-color-scheme: light) {
  .choice-meta.success { background: rgba(5,150,105,.10); border-color: rgba(5,150,105,.22); }
  .choice-meta.warn { background: rgba(180,83,9,.10); border-color: rgba(180,83,9,.22); }
}
.choice .choice-desc { color: var(--muted); font-size: .9rem; margin-top: 6px; line-height: 1.55; }
.choice .choice-desc code { font-size: .92em; }
/* Number badge: doubles as the keyboard-shortcut hint (1–9) */
.choice-num {
  counter-increment: choice; flex: none;
  width: 30px; height: 30px; margin-top: 1px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: var(--glass-2); border: 1px solid var(--border);
  color: var(--muted); font-size: .8rem; font-weight: 700;
  font-variant-numeric: tabular-nums;
  transition: border-color .16s ease, color .16s ease, background .16s ease;
}
.choice-num::before { content: counter(choice); }
.choice:hover .choice-num { border-color: var(--accent); color: var(--accent); }
.choice.selected .choice-num { background: var(--accent-grad); border-color: transparent; color: #fff; }
.choice-other .choice-num::before { content: none; }
.choice-num-other::after { content: "✎"; font-size: .85rem; }
/* Selected: gradient border ring + left accent bar + opaque tinted fill + right-edge check badge */
.choice.selected {
  border-color: transparent;
  background-image: linear-gradient(var(--sel-fill), var(--sel-fill)), var(--accent-grad);
  background-origin: padding-box, border-box;
  background-clip: padding-box, border-box;
  box-shadow: inset 3px 0 0 var(--accent), 0 0 0 1px rgba(129,140,248,.35), 0 10px 30px var(--accent-glow), var(--inset-hi);
  transform: translateY(-1px);
}
.choice.selected::after {
  content: ""; position: absolute; top: 13px; right: 13px; width: 20px; height: 20px; border-radius: 50%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='10' fill='%236366f1'/%3E%3Cpath d='M5.5 10.5l3 3 6-7' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E");
  background-size: 100% 100%;
  opacity: 0; transform: scale(.5); transition: opacity .18s ease, transform .18s ease;
}
.choice.selected::after { opacity: 1; transform: scale(1); }
.choice.selected .choice-desc { color: rgba(255,255,255,.68); }
@media (prefers-color-scheme: light) { .choice.selected .choice-desc { color: rgba(24,24,27,.68); } }
.choice-other .other-input {
  margin-top: 8px; width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius-xs);
  background: var(--control); color: var(--text); font: inherit; font-size: .8125rem;
}
.choice-other .other-input:focus { outline: none; border-color: rgba(129,140,248,.7); box-shadow: 0 0 0 3px var(--accent-soft); }

.choice-count {
  margin-top: 10px; font-size: .85em; color: var(--muted);
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 11px; border-radius: 999px;
  background: var(--glass-2); border: 1px solid var(--border);
}
.choice-count[hidden] { display: none; }

.field { margin-bottom: 14px; }
.field label { display: block; font-weight: 500; margin-bottom: 7px; font-size: .8125rem; color: var(--label); }
.field .req { color: var(--danger); }
.field input[type="text"], .field input[type="email"], .field input[type="number"],
.field input[type="url"], .field input[type="date"], .field textarea, .field select {
  width: 100%; padding: 13px 16px; border: 1px solid var(--border); border-radius: var(--radius-xs);
  background: var(--control); color: var(--text); font: inherit;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 1px 2px rgba(0,0,0,.12);
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
}
.field input::placeholder, .field textarea::placeholder { color: var(--faint); }
.field select { height: calc(1.55em + 24px); }
.field select option { background: #131316; color: var(--text); }
@media (prefers-color-scheme: light) { .field select option { background: #fff; } }
.field input:focus, .field textarea:focus, .field select:focus {
  outline: none; border-color: rgba(129,140,248,.7);
  box-shadow: 0 0 0 3px var(--accent-soft), 0 0 16px var(--accent-glow);
}
.field-error { color: var(--danger); font-size: .87em; margin-top: 6px; display: none; line-height: 1.5; }
.field.invalid .field-error { display: block; }
.field.invalid input, .field.invalid textarea, .field.invalid select { border-color: var(--danger); box-shadow: 0 0 0 3px var(--danger-soft); }
/* Inline boolean: same material as inputs, same check metaphor as choice cards */
.check-row {
  display: flex; align-items: center; gap: 11px; cursor: pointer;
  padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius-xs);
  background: var(--control); box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 1px 2px rgba(0,0,0,.12);
  font-weight: 500; font-size: .8125rem; color: var(--label);
  transition: border-color .15s ease, background .15s ease;
}
.check-row:hover { border-color: var(--border-strong); background: var(--control-hover); }
.check-row:has(input:checked) { border-color: rgba(129,140,248,.55); }
@media (prefers-color-scheme: light) { .check-row:has(input:checked) { border-color: rgba(99,102,241,.5); } }
.check-row input {
  appearance: none; -webkit-appearance: none; flex: none; margin: 0; cursor: pointer;
  width: 20px; height: 20px; border: 2px solid var(--control-border); background: transparent;
  border-radius: 6px;
  transition: border-color .16s ease, background .16s ease, box-shadow .16s ease;
}
.check-row input:checked {
  border-color: var(--accent);
  background: var(--accent-grad);
  background-size: 100% 100%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M3.5 8.5l3 3 6-7' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.note-area { margin: 2px 0 0; }
.note-area textarea { width: 100%; min-height: 78px; resize: vertical; }
#choice-error { margin-top: 10px; }

#input-region { margin-top: 32px; }

.actions {
  position: sticky; bottom: 0; z-index: 5;
  display: flex; gap: 12px; flex-wrap: wrap;
  margin: 32px calc(-1 * var(--pad) - 9px) calc(-1 * var(--pad)) calc(-1 * var(--pad) - 9px);
  padding: 14px calc(var(--pad) + 8px) 16px;
  border-top: 1px solid var(--border);
  border-radius: 0 0 var(--radius) var(--radius);
  background: rgba(10,10,12,.86);
  -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
}
@media (prefers-color-scheme: light) { .actions { background: rgba(245,245,246,.85); } }
/* Keyboard shortcut hint, pushed to the right of the actions row */
.kbd-hint {
  margin-left: auto; align-self: center;
  font-size: .8rem; color: var(--faint); white-space: nowrap;
}
.kbd-hint kbd {
  font-family: var(--mono); font-size: .72rem; font-weight: 600;
  padding: 2px 7px; border-radius: 6px;
  background: var(--glass-2); border: 1px solid var(--border);
  border-bottom-width: 2px; color: var(--muted);
}
button {
  font: inherit; font-weight: 650; font-size: .95rem; padding: 13px 26px;
  border-radius: var(--radius-xs); border: 1px solid transparent; cursor: pointer;
  transition: transform .15s ease, box-shadow .15s ease, filter .15s ease, background .15s ease;
}
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
button:active:not(:disabled) { transform: translateY(1px); }
.btn-primary {
  min-width: 140px;
  background: var(--accent-grad); color: #fff;
  box-shadow: 0 4px 14px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,.25);
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 8px 22px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,.25); }
.btn-danger {
  background: var(--danger-soft); color: var(--danger); border-color: rgba(244,63,94,.4);
}
.btn-danger:hover:not(:disabled) { background: rgba(244,63,94,.22); }
.btn-secondary {
  background: var(--glass-2); color: var(--muted); border-color: var(--border);
  box-shadow: var(--inset-hi);
}
.btn-secondary:hover:not(:disabled) { color: var(--text); border-color: var(--border-strong); background: var(--glass-hi); }
button:disabled { opacity: .45; cursor: not-allowed; }

.status {
  display: none; margin-top: 22px; padding: 13px 18px; border-radius: var(--radius-sm);
  border: 1px solid var(--border); background: var(--glass-2);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  align-items: center; gap: 11px; box-shadow: var(--inset-hi);
  font-size: .97em;
}
.status.show { display: flex; }
.status .spinner {
  width: 17px; height: 17px; flex: none; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.status.done { border-color: rgba(16,185,129,.4); color: var(--success); background: var(--success-soft); }
.status.done .spinner { display: none; }
.status.err { border-color: rgba(244,63,94,.45); color: var(--danger); background: var(--danger-soft); }
.status.err .spinner { display: none; }

body.terminal .actions { display: none; }
body.terminal #input-region { opacity: .72; pointer-events: none; user-select: none; }

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
[hidden] { display: none !important; }
`.trim()
}
