export interface MascotMessage {
  header: string;
  prefix?: string;
  boldText?: string;
  suffix?: string;
  fullText?: string;
}

interface RawMessage {
  header: string;
  prefix?: string;
  suffix?: string;
  fullText?: string;
  /** If true, boldText will show currentCalories instead of remaining */
  useCurrentCal?: boolean;
}

const NO_GOAL_MESSAGES: RawMessage[] = [
  {
    header: "Wo ist das Ziel?",
    fullText: "Trage dein Tagesziel ein, damit ich weiß, wie viele Nüsse wir sammeln müssen!",
  },
  {
    header: "Bereit zum Start?",
    fullText: "Ohne Tagesziel kann ich deine Eicheln nicht zählen. Trag eins im Profil ein!",
  },
];

const ZERO_CAL_MESSAGES: RawMessage[] = [
  {
    header: "Guten Morgen, Sammler!",
    fullText: "Noch keine Eicheln im Sack. Was gibt's heute Leckeres?",
  },
  {
    header: "Bereit zum Flitzen?",
    fullText: "Zeit, die Pfoten zu strecken und das erste Essen einzutragen!",
  },
  {
    header: "Frischer Start!",
    fullText: "Ein neuer Tag, ein leerer Zähler – das ist die beste Ausgangslage!",
  },
  {
    header: "Leere Leinwand!",
    fullText: "Der Tag ist noch komplett offen. Mal sehen, was wir draus machen!",
  },
  {
    header: "Guten Hunger!",
    fullText: "Noch keine Eicheln, dafür jede Menge Möglichkeiten. Leg einfach los!",
  },
  {
    header: "Die Jagd beginnt!",
    fullText: "Heute ist alles möglich. Trag das erste Essen ein und ich freu mich mit!",
  },
];

const LOW_CAL_MESSAGES: RawMessage[] = [
  {
    header: "Erste Nüsse gesichert!",
    prefix: "Noch ",
    suffix: " bis zum Tagesziel. Ein super Start!",
  },
  {
    header: "Guter Start!",
    prefix: "Schon ",
    suffix: " gesammelt. Der Vorrat wächst!",
    useCurrentCal: true,
  },
  {
    header: "Fleißig am Sammeln!",
    prefix: "Schritt für Schritt. Noch ",
    suffix: " übrig für heute.",
  },
  {
    header: "Erste Beute!",
    prefix: "Noch ",
    suffix: " bis zum Ziel – super eingestiegen!",
  },
  {
    header: "Schon was gesichert!",
    prefix: "",
    suffix: " eingesammelt und der Tag ist noch lang!",
    useCurrentCal: true,
  },
  {
    header: "Klein, aber fein!",
    prefix: "Noch ",
    suffix: " offen – du hast heute noch viel Spielraum!",
  },
  {
    header: "Auf in den Wald!",
    prefix: "Erst ",
    suffix: " – da ist noch ordentlich Platz für leckere Sachen!",
    useCurrentCal: true,
  },
];

const MID_CAL_MESSAGES: RawMessage[] = [
  {
    header: "Halbzeit!",
    prefix: "Der Vorrat nimmt Gestalt an. Noch ",
    suffix: " übrig.",
  },
  {
    header: "Im Rhythmus!",
    prefix: "Dein Tagesziel rückt näher. Noch ",
    suffix: " zu sammeln.",
  },
  {
    header: "Mitten im Schwung!",
    prefix: "Noch ",
    suffix: " – weiter, du bist super unterwegs!",
  },
];

const NEAR_CAL_MESSAGES: RawMessage[] = [
  {
    header: "Ziel im Blick!",
    prefix: "Nur noch ",
    suffix: " übrig für heute.",
  },
  {
    header: "Fast am Ziel!",
    prefix: "Such dir eine besonders feine Nuss aus. Noch ",
    suffix: " bis zum Ziel.",
  },
  {
    header: "Letzte Nuss!",
    prefix: "Noch ",
    suffix: " – dann ist der Sack voll!",
  },
  {
    header: "Endspurt!",
    prefix: "Noch ",
    suffix: " – ich feuere dich an!",
  },
  {
    header: "Zielgerade!",
    prefix: "Noch ",
    suffix: " und du bist am Tagesziel für heute.",
  },
];

const TARGET_MET_MESSAGES: RawMessage[] = [
  {
    header: "Punktlandung!",
    fullText: "Genau im Zielbereich! Du bist ein echter Meister-Sammler.",
  },
  {
    header: "Volltreffer!",
    fullText: "Nussvorrat perfekt ausbalanciert. Besser geht's nicht!",
  },
  {
    header: "Bullseye! 🎯",
    fullText: "Tagesziel getroffen – das ist die Meisterklasse!",
  },
  {
    header: "Perfekt gelandet!",
    fullText: "Nicht mehr, nicht weniger. Genau richtig für heute!",
  },
  {
    header: "Sauber!",
    fullText: "Tagesziel erfüllt. Abends entspannt zurücklehnen – verdient!",
  },
  {
    header: "Ich bin begeistert!",
    fullText: "Du bist genau im Ziel. Komm morgen wieder, das machen wir nochmal!",
  },
];

const OVER_CAL_MESSAGES: RawMessage[] = [
  {
    header: "Gut gesättigt!",
    prefix: "Etwas über dem Limit: ",
    suffix: " über dem Ziel. Kein Problem!",
  },
  {
    header: "Ein kleiner Bonus!",
    prefix: "Ein paar Extra-Nüsse schaden nie. Genau ",
    suffix: " überm Plan.",
  },
  {
    header: "Kleines Bonus-Level!",
    prefix: "Nur ",
    suffix: " über dem Plan – das ist doch kein Problem!",
  },
  {
    header: "Ein bisschen extra!",
    prefix: "",
    suffix: " mehr als geplant – das gehört dazu!",
  },
  {
    header: "Drüber, aber happy!",
    prefix: "Gerade mal ",
    suffix: " zu viel – morgen einfach weitermachen!",
  },
];

const HIGH_OVER_CAL_MESSAGES: RawMessage[] = [
  {
    header: "Winterschlaf-Modus!",
    prefix: "Ordentlicher Puffer! ",
    suffix: " über dem Limit. Morgen flitzen wir wieder!",
  },
  {
    header: "Gönnung pur!",
    fullText: "Manchmal braucht man extra Eicheln. Morgen sammeln wir ganz entspannt weiter!",
  },
  {
    header: "Satte Ernte!",
    fullText: "Ordentlich was gesammelt heute! Morgen fangen wir frisch an – ich freu mich drauf!",
  },
  {
    header: "Großer Tag!",
    fullText: "Manchmal braucht man einfach mehr Eicheln. Ich urteile nicht, ich zähle nur!",
  },
  {
    header: "Geht auch mal!",
    fullText: "Heute war's ein bisschen mehr – und das ist völlig okay. Ich bin trotzdem stolz auf dich!",
  },
];

export function getMascotMessage(
  currentCalories: number,
  goalCalories: number | null,
  indexSeed: number
): MascotMessage {
  if (goalCalories === null || goalCalories <= 0) {
    const raw = NO_GOAL_MESSAGES[indexSeed % NO_GOAL_MESSAGES.length];
    return { header: raw.header, fullText: raw.fullText };
  }

  const percent = (currentCalories / goalCalories) * 100;

  let rawList: RawMessage[];
  let boldVal = "";

  if (currentCalories === 0) {
    rawList = ZERO_CAL_MESSAGES;
  } else if (percent < 40) {
    rawList = LOW_CAL_MESSAGES;
    const raw = rawList[indexSeed % rawList.length];
    boldVal = raw.useCurrentCal
      ? `${Math.round(currentCalories)} kcal`
      : `${Math.round(goalCalories - currentCalories)} kcal`;
  } else if (percent < 80) {
    rawList = MID_CAL_MESSAGES;
    boldVal = `${Math.round(goalCalories - currentCalories)} kcal`;
  } else if (percent < 98) {
    rawList = NEAR_CAL_MESSAGES;
    boldVal = `${Math.round(goalCalories - currentCalories)} kcal`;
  } else if (percent <= 102) {
    rawList = TARGET_MET_MESSAGES;
  } else if (percent <= 115) {
    rawList = OVER_CAL_MESSAGES;
    boldVal = `${Math.round(currentCalories - goalCalories)} kcal`;
  } else {
    rawList = HIGH_OVER_CAL_MESSAGES;
    boldVal = `${Math.round(currentCalories - goalCalories)} kcal`;
  }

  const raw = rawList[indexSeed % rawList.length];
  return {
    header: raw.header,
    prefix: raw.prefix,
    boldText: boldVal,
    suffix: raw.suffix,
    fullText: raw.fullText,
  };
}
