/* Placeholder component, so a fresh gallery runs end to end with no assets at
   all. Replace this file with the real component: copy the client's logo,
   artwork and copy in, then swap the text mark below for their logo image.

   How to write the variants: references/writing-variants.md next to the SKILL.md
   of the skill that generated this folder. */

import { BRAND, componentFurniture } from './shared.js';

const f = componentFurniture();

const baseCss = `
  :root {
    --ink: #14121a;
    --panel: #1d1a26;
    --gold: #b4823c;
    --gold-bright: #d4a45c;
    --text: #ece4f5;
    --muted: #c8bbd6;
    --line: rgba(255,255,255,.14);
    --heading: 'Fredoka', system-ui, sans-serif;
    --body: 'Work Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--ink); }
  body { color: var(--text); font-family: var(--body); font-size: 15px; line-height: 1.6; }
  a { color: inherit; text-decoration: none; }
  a:hover { color: var(--gold-bright); }
  .block { position: relative; overflow: hidden; }
  .wrap { width: min(1120px, 100% - 44px); margin-inline: auto; }
  .mark { margin: 0; font-family: var(--heading); font-weight: 700; font-size: 30px; }
  .tagline { margin: 0; color: var(--muted); max-width: 44ch; }

  .social-row { display: flex; flex-wrap: wrap; gap: 10px; }
  .social {
    display: grid; place-items: center; width: 44px; height: 44px;
    border: 1px solid var(--line); border-radius: 999px;
    background: rgba(255,255,255,.05); color: var(--text);
  }
  .social:hover { border-color: var(--gold-bright); color: var(--gold-bright); }
  .social .icon { width: 19px; height: 19px; }

  .newsletter { display: grid; gap: 9px; width: 100%; max-width: 420px; }
  .newsletter-label { font-family: var(--heading); font-weight: 600; }
  .newsletter-row {
    display: flex; gap: 8px; padding: 6px; border: 1px solid var(--line);
    border-radius: 999px; background: rgba(255,255,255,.06);
  }
  .newsletter-row input {
    flex: 1 1 auto; min-width: 0; padding: 9px 14px; border: 0;
    background: transparent; color: var(--text); font: inherit; font-size: 14px;
  }
  .newsletter-row input:focus { outline: none; }
  .newsletter-row button {
    flex: 0 0 auto; padding: 9px 18px; border: 0; border-radius: 999px;
    background: var(--gold); color: var(--ink); cursor: pointer;
    font-family: var(--heading); font-weight: 600; font-size: 14px;
  }
  .link-row { display: flex; flex-wrap: wrap; gap: 10px 22px; }
  .link-row a { color: var(--muted); font-size: 14px; }
  .bottom { display: grid; gap: 10px; padding-top: 18px; border-top: 1px solid var(--line); }
  .bottom small { color: var(--muted); font-size: 12.5px; }
  .bottom nav { display: flex; flex-wrap: wrap; gap: 6px 18px; }
  .bottom nav a { color: var(--muted); font-size: 12.5px; }
`;

const v1 = {
  id: '1',
  name: 'Centred stack',
  note: 'Everything centred on a flat panel. The default starting point.',
  bestFor: 'Short components where one column of content is enough.',
  css: `
    .f1 { background: var(--ink); }
    .f1 .inner { display: grid; justify-items: center; gap: 18px; padding: 58px 0 26px; text-align: center; }
    .f1 .bottom { width: 100%; justify-items: center; }
    @media (max-width: 560px) { .f1 .inner { padding: 42px 0 22px; } }
  `,
  html: `
    <footer class="block f1">
      <div class="wrap inner">
        <p class="mark">${BRAND.name}</p>
        <p class="tagline">${BRAND.tagline}</p>
        <div class="social-row">${f.socialRow}</div>
        ${f.newsletter}
        <nav class="link-row" aria-label="Footer">${f.navLinks}</nav>
        <div class="bottom">
          <small>${BRAND.copyright}</small>
          <nav aria-label="Legal">${f.legalLinks}</nav>
        </div>
      </div>
    </footer>`,
};

const v2 = {
  id: '2',
  name: 'Split',
  note: 'Brand and sign-up on the left, links on the right. Height stays short.',
  bestFor: 'Components with enough links to need their own column.',
  css: `
    .f2 { background: var(--panel); }
    .f2 .inner { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 34px; padding: 52px 0 26px; }
    .f2 .brand-col { display: grid; gap: 16px; align-content: start; }
    .f2 .links { display: grid; gap: 8px; align-content: start; }
    .f2 .links a { color: var(--muted); font-size: 14px; }
    .f2 .bottom { grid-column: 1 / -1; }
    @media (max-width: 780px) {
      .f2 .inner { grid-template-columns: minmax(0, 1fr); gap: 24px; padding: 42px 0 22px; }
    }
  `,
  html: `
    <footer class="block f2">
      <div class="wrap inner">
        <div class="brand-col">
          <p class="mark">${BRAND.name}</p>
          <p class="tagline">${BRAND.tagline}</p>
          ${f.newsletter}
          <div class="social-row">${f.socialRow}</div>
        </div>
        <nav class="links" aria-label="Footer">${f.navLinks}</nav>
        <div class="bottom">
          <small>${BRAND.copyright}</small>
          <nav aria-label="Legal">${f.legalLinks}</nav>
        </div>
      </div>
    </footer>`,
};

export default {
  id: 'example',
  label: 'Example component',
  status: 'Placeholder',
  summary: 'A placeholder so a fresh gallery runs. Replace it with the real component.',
  brief:
    'Every option carries the same content and differs only in arrangement, so the client is comparing design rather than features.',
  baseCss,
  variants: [v1, v2],
};
