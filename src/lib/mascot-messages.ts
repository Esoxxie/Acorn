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
  },
  {
    header: "Fleißig am Sammeln!",
    prefix: "Schritt für Schritt. Noch ",
    suffix: " übrig für heute.",
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
    if (raw.header === "Guter Start!") {
      boldVal = `${Math.round(currentCalories)} kcal`;
    } else {
      boldVal = `${Math.round(goalCalories - currentCalories)} kcal`;
    }
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
