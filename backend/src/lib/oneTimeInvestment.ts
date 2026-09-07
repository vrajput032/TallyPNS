/** Capital / one-time factory investment. Notes may be Hindi, Hinglish, or English. */

const DEVANAGARI_INVESTMENT =
  /मशीन|सी\s*एन\s*सी|ट्रॉब|ट्राब|ट्रॉब|कैमरा|कैलिपर|कलिपर|लेथ|औजार|औज़ार|निवेश|पूंजी|पूँजी|खरीद/;

/** Fold common Hinglish spellings so "mashin", "masheen", "auzar" still match. */
export function foldHinglish(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u0900-\u097F]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bc\s*n\s*c\b/g, " cnc ")
    .replace(/\bmashe+n\b/g, " machine ")
    .replace(/\bmashin\b/g, " machine ")
    .replace(/\bmesin\b/g, " machine ")
    .replace(/\bmachin\b/g, " machine ")
    .replace(/\btrab\b/g, " traub ")
    .replace(/\btrob\b/g, " traub ")
    .replace(/\bkamera\b/g, " camera ")
    .replace(/\bcamra\b/g, " camera ")
    .replace(/\bkall?i?per\b/g, " caliper ")
    .replace(/\bauza+r\b/g, " tools ")
    .replace(/\baujaar\b/g, " tools ")
    .replace(/\bnivesh\b/g, " investment ")
    .replace(/\bp+unji\b/g, " capital ")
    .replace(/\bleth\b/g, " lathe ")
    .replace(/\bhisa+b\b/g, " hisab ")
    .replace(/\bkhare+d\b/g, " kharid ")
    .replace(/\bkharidi\b/g, " kharid ")
    .replace(/\bonetime\b/g, " one time ")
    .replace(/\bekbaar\b/g, " one time ")
    .replace(/\bek bar\b/g, " one time ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isOneTimeInvestmentDescription(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;
  const folded = foldHinglish(raw);

  /* Freight on a machine is delivery, not the asset. Hindi "kiraya" is the same word. */
  if (/\bkiraya\b/.test(folded) || /किराया/.test(raw)) return false;

  if (DEVANAGARI_INVESTMENT.test(raw)) return true;

  if (/\bcnc\b/.test(folded)) return true;
  if (/\blathe\b|\bspindle\b/.test(folded)) return true;
  if (/\bcaliper\b/.test(folded)) return true;
  if (/\bcamera\b/.test(folded)) return true;
  if (/\blight meter\b/.test(folded)) return true;
  if (/domain and email|gst documents/.test(folded)) return true;
  if (/\binvestment\b|\bcapital\b/.test(folded)) return true;
  if (/\bmachine\b/.test(folded)) return true;
  if (/^tools\b/.test(folded) || /\bmb tools\b/.test(folded)) return true;
  if (/\btraub\b/.test(folded) && /\b(manufacturer|bhatia|machine|advance|payment|tool)\b/.test(folded)) {
    return true;
  }
  if (/^traub\b/.test(folded)) return true;
  if (/\bvishal\b/.test(folded) && /\b(given|cash|hisab|outstanding|traub|machine)\b/.test(folded)) {
    return true;
  }
  if (/^vishal$/.test(folded)) return true;
  if (/\bkharid\b/.test(folded) && /\b(machine|cnc|traub|tools|caliper|camera|lathe)\b/.test(folded)) {
    return true;
  }
  if (/\bone time\b/.test(folded) && /\b(machine|cnc|traub|tools|investment)\b/.test(folded)) {
    return true;
  }
  return false;
}

export const ONE_TIME_INVESTMENT_SKIP_REASON = "One-time investment";
