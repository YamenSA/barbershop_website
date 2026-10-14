export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  link?: { href: string; label: string };
}

export const faqs: FaqItem[] = [
  {
    id: 'termin-buchen',
    question: 'Muss ich einen Termin buchen?',
    answer:
      'Nein. Damen und Herren sind mit oder ohne Termin willkommen. Ohne Termin kann es zu Wartezeiten kommen. Deinen Besuch kannst du online oder telefonisch planen.',
    link: { href: '/termin', label: 'Termin buchen' },
  },
  {
    id: 'dauer-haarschnitt',
    question: 'Wie lange dauert ein Haarschnitt?',
    answer:
      'Die Dauer hängt von der gewählten Leistung ab. In unserer Leistungsübersicht steht die Dauer bei jeder Leistung, damit du deinen Besuch planen kannst.',
    link: { href: '/dienstleistungen', label: 'Leistungen und Dauer ansehen' },
  },
  {
    id: 'preise',
    question: 'Was kosten die Dienstleistungen?',
    answer:
      'Die aktuellen Preise stehen unter „Leistungen & Preise“. Bei „ab“-Preisen hängt der Endpreis von Haarlänge und Aufwand ab. Wir besprechen ihn vor Beginn.',
    link: { href: '/dienstleistungen', label: 'Preisliste ansehen' },
  },
  {
    id: 'termin-absagen',
    question: 'Kann ich einen Termin absagen?',
    answer:
      'Ja. Über den Link in deiner Bestätigungs-E-Mail kannst du bis 24 Stunden vor dem Termin absagen. Bei kurzfristigen Absagen ruf bitte im Salon an.',
    link: { href: '/kontakt', label: 'Kontakt zum Salon' },
  },
  {
    id: 'zahlung-online',
    question: 'Muss ich bei der Online-Buchung bezahlen?',
    answer:
      'Nein. Bei der Online-Buchung wird nichts bezahlt. Du bezahlst nach deinem Besuch bar vor Ort im Salon.',
  },
  {
    id: 'bartpflege',
    question: 'Bietet ihr Bartpflege und Rasur an?',
    answer:
      'Ja. Unsere Angebote für Bartpflege und Rasur findest du mit Preisen und Dauer in der Leistungsübersicht.',
    link: { href: '/dienstleistungen', label: 'Leistungen ansehen' },
  },
  {
    id: 'aktualitaet',
    question: 'Wie aktuell sind Öffnungszeiten und Preise auf der Website?',
    answer:
      'Wir pflegen die Angaben laufend. Bei Rückfragen oder kurzfristigen Änderungen, etwa an Feiertagen, ruf uns bitte an.',
    link: { href: '/kontakt', label: 'Öffnungszeiten und Kontakt' },
  },
  {
    id: 'team-wahl',
    question: 'Kann ich ein Teammitglied auswählen?',
    answer:
      'Ja. Bei der Online-Buchung kannst du ein Teammitglied auswählen oder ohne feste Auswahl buchen. Auf der Teamseite führt „Bei … buchen“ direkt zur Buchung mit deinem gewählten Teammitglied.',
    link: { href: '/ueber-uns', label: 'Unser Team kennenlernen' },
  },
  {
    id: 'kartenzahlung',
    question: 'Kann ich mit Karte zahlen?',
    answer:
      'Nein, bezahlt wird bar vor Ort.',
  },
  {
    id: 'anfahrt',
    question: 'Wie finde ich den Salon?',
    answer:
      'Adresse und Öffnungszeiten findest du auf unserer Kontaktseite. Dort kannst du deine Route planen. Die interaktive Google-Karte laden wir erst nach deiner Zustimmung.',
    link: { href: '/kontakt', label: 'Kontakt und Anfahrt' },
  },
];
