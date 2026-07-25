// Best-effort keyword classification of an item name into one of FMB's fixed
// item categories. The legacy stock-register export this feeds from has no
// category column at all, so this is a heuristic, not authoritative data —
// every row's assigned category is returned in the import summary so an
// admin can spot-check and correct via the normal Item edit screen.

const CATEGORY_NAMES = {
  GROCERY: 'Grocery',
  NON_FOOD: 'Non Food Items',
  VEGETABLE: 'Vegetable',
  COLD_STORAGE: 'Cold Storage',
  DAIRY: 'Dairy Products',
};

// Checked in order — first match wins. Kept deliberately narrow (e.g. no
// generic "DHANIYA" rule, since that would misclassify "DHANIYA POWDER").
const RULES = [
  {
    category: CATEGORY_NAMES.NON_FOOD,
    pattern: /\b(CONTAINER|PAPER CUP|TISSUE PAPER|BUTTER (PAPER|PEPPER) SHEET|NAPKIN|DISPOSABLE)\b/i,
  },
  {
    category: CATEGORY_NAMES.COLD_STORAGE,
    pattern: /\[F\]|\b(CHICKEN|MUTTON|GOSH|GOSHT|KHEEMA|PAAYA|PAIYA|LEG THIGH|SOUP BONE|NIHARI|FROZEN|FISH|PRAWN)\b/i,
  },
  {
    category: CATEGORY_NAMES.DAIRY,
    pattern: /\b(MILK|DAHI|PANEER|GHEE|BUTTER|MAKKHAN|KHOWA|CREAM|LASSI|EGG)\b/i,
  },
  {
    category: CATEGORY_NAMES.VEGETABLE,
    pattern: /\[VEG\]|\b(PYAAZ|ADRAK|LASAN|GAJAR|MOOLI|GOBI|SHIMLA|METHI|PUDINA|MASHROM|MUSHROOM|FRENCH BEAN|GREEN PEAS|RATALO|LAUKI|BHAJI|SAMAR|NIMBOO|SWEET CORN|DESI TOMATO|HAARI MIRCHI|LEMON GRASS)\b/i,
  },
];

function classifyItemCategory(name) {
  const match = RULES.find((rule) => rule.pattern.test(name));
  return match ? match.category : CATEGORY_NAMES.GROCERY;
}

module.exports = { classifyItemCategory, CATEGORY_NAMES };
