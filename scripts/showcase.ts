import { mkdirSync } from "node:fs";

type Shot = { file: string; out: string; setup?: string; scroll?: "mid" };

const W = 1280;
const H = 830;
mkdirSync("docs/screenshots", { recursive: true });

const shots: Shot[] = [
  { file: "single-2", out: "docs/screenshots/choice-cards.png" },
  {
    file: "choice-other",
    out: "docs/screenshots/other-input.png",
    setup: `(function(){var i=document.getElementById('other-input');i.value='shadow — mirror prod traffic, zero responses';i.dispatchEvent(new Event('input'));})()`,
  },
  { file: "longPlan", out: "docs/screenshots/sticky-bar.png", scroll: "mid" },
  { file: "blocks-full", out: "docs/screenshots/blocks.png" },
];

for (const s of shots) {
  await using view: any = new (Bun as any).WebView({ width: W, height: H });
  await view.navigate(`file:///tmp/ask-fixtures/${s.file}.html`);
  await new Promise((r) => setTimeout(r, 650));
  try {
    await view.evaluate("document.fonts.ready");
  } catch {}
  if (s.setup) await view.evaluate(s.setup);
  if (s.scroll === "mid") {
    await view.evaluate(`(function(){var c=document.querySelector('.card').getBoundingClientRect().bottom+window.scrollY;var m=Math.max(0,c-window.innerHeight);window.scrollTo({top:Math.round(m*0.5),behavior:'instant'});})()`);
  }
  await new Promise((r) => setTimeout(r, 350));
  const png = await view.screenshot();
  await Bun.write(s.out, png);
  console.log("→", s.out);
}
