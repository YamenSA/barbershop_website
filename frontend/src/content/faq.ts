export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const faqs: FaqItem[] = [
  {
    id: 'termin-buchen',
    question: 'Muss ich einen Termin buchen?',
    answer:
      'Ja — wir arbeiten ausschließlich auf Terminbasis, damit wir uns für jeden Kunden ' +
      'ausreichend Zeit nehmen können. Einen Termin buchen Sie bequem online über den ' +
      '„Termin buchen"-Button oder telefonisch.',
  },
  {
    id: 'dauer-haarschnitt',
    question: 'Wie lange dauert ein Haarschnitt?',
    answer:
      'Ein klassischer Herrenhaarschnitt dauert in der Regel 30 Minuten. Kombinierte ' +
      'Dienstleistungen — zum Beispiel Haarschnitt mit Bartpflege oder Rasur — können ' +
      '45 bis 60 Minuten in Anspruch nehmen. Die genaue Dauer entnehmen Sie bitte der ' +
      'Dienstleistungsübersicht.',
  },
  {
    id: 'preise',
    question: 'Was kosten die Dienstleistungen?',
    answer:
      'Eine vollständige Preisübersicht finden Sie auf unserer Seite „Dienstleistungen". ' +
      'Alle Preise sind Endpreise inklusive Mehrwertsteuer — keine versteckten Aufschläge.',
  },
  {
    id: 'absagen-umbuchen',
    question: 'Kann ich einen Termin absagen oder verschieben?',
    answer:
      'Ja. Bitte sagen Sie Ihren Termin mindestens 24 Stunden vorher ab oder schreiben ' +
      'Sie uns an, damit wir den Slot neu vergeben können. Kurzfristige Absagen ohne ' +
      'Vorankündigung erschweren uns die Planung — wir bitten um Ihr Verständnis.',
  },
  {
    id: 'zahlung',
    question: 'Welche Zahlungsmethoden akzeptieren Sie?',
    answer:
      'Wir akzeptieren Barzahlung und gängige Kartenzahlung (EC/Girocard sowie die ' +
      'wichtigsten Kreditkarten). Bitte erfragen Sie aktuelle Zahlungsoptionen direkt ' +
      'bei uns, da sich das Angebot ändern kann.',
  },
  {
    id: 'bartpflege',
    question: 'Bieten Sie auch Bartpflege und Rasur an?',
    answer:
      'Ja — Bartpflege, Konturschnitt und klassische Nassrasur gehören zu unserem ' +
      'Kernprogramm. Alle verfügbaren Dienstleistungen mit Preisen und Dauer finden ' +
      'Sie auf unserer Dienstleistungsseite.',
  },
  {
    id: 'aktualitaet',
    question: 'Wie aktuell sind Öffnungszeiten und Preise auf der Website?',
    answer:
      'Öffnungszeiten, Preise und Teaminfos werden direkt aus unserem System geladen ' +
      'und sind in der Regel innerhalb von etwa einer Minute nach einer Änderung ' +
      'aktualisiert. Bei kurzfristigen Abweichungen (z. B. Feiertagen) empfehlen wir ' +
      'einen kurzen Anruf.',
  },
];
