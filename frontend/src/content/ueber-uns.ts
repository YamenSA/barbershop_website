export interface UeberUnsSection {
  heading: string;
  body: string;
}

export interface UeberUnsContent {
  headline: string;
  intro: string;
  sections: UeberUnsSection[];
}

export const ueberUns: UeberUnsContent = {
  headline: 'Handwerk trifft Präzision.',
  intro:
    'Willkommen bei Azzam Barbershop — Ihrem Barbershop für präzise Schnitte, ' +
    'klassische Fades und handwerkliche Bartpflege. Wir glauben, dass ein guter ' +
    'Haarschnitt mehr ist als Ästhetik: Er ist Ausdruck von Anspruch und ' +
    'Selbstbewusstsein.',
  sections: [
    {
      heading: 'Unser Handwerk',
      body:
        'Jeder Schnitt beginnt mit einem Gespräch. Wir nehmen uns die Zeit, ' +
        'Ihre Wünsche zu verstehen — ob klassischer Herrenschnitt, texturierter ' +
        'Crop oder ein maßgeschneiderter Fade. Unsere Werkzeuge sind scharf, ' +
        'unsere Techniken bewährt, unser Anspruch unnachgiebig.',
    },
    {
      heading: 'Unsere Geschichte',
      body:
        'Azzam Barbershop entstand aus der Überzeugung, dass Cottbus einen Barbershop ' +
        'braucht, in dem Handwerk und Stil gleichrangig sind. Was als kleines ' +
        'Atelier begann, ist heute ein Ort, an dem Stammkunden zurückkehren — ' +
        'nicht nur für den Schnitt, sondern für das Erlebnis.',
    },
    {
      heading: 'Was uns antreibt',
      body:
        'Keine Massenabfertigung, keine Abkürzungen. Wir arbeiten konzentriert, ' +
        'präzise und mit echtem Interesse am Ergebnis. Jeder Kunde verlässt uns ' +
        'so, wie er sich selbst am besten sieht — das ist der Maßstab, an dem ' +
        'wir uns messen.',
    },
  ],
};
