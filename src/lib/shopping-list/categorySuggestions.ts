export const CATEGORY_KB_VERSION = 1;

export type CategorySuggestionSource = "manual_override" | "exact" | "alias" | "token" | "fallback";

export type CategorySuggestion = {
  category: string;
  confidence: number;
  source: CategorySuggestionSource;
  matchedTerm?: string;
  kbVersion: number;
};

export type CategoryOverrideMap = Record<string, string>;

type CategoryKnowledgeEntry = {
  category: string;
  terms: string[];
};

const CATEGORY_OVERRIDE_STORAGE_PREFIX = "gestor-despensa.category-overrides.v1";
const FALLBACK_CATEGORY = "Outros";

const CATEGORY_KB: CategoryKnowledgeEntry[] = [
  {
    category: "Frutas",
    terms: [
      "abacate",
      "abacaxi",
      "banana",
      "goiaba",
      "kiwi",
      "laranja",
      "limao",
      "maca",
      "mamao",
      "manga",
      "maracuja",
      "melancia",
      "melao",
      "morango",
      "pera",
      "uva",
    ],
  },
  {
    category: "Verduras e Legumes",
    terms: [
      "abobrinha",
      "agriao",
      "alface",
      "alho",
      "batata",
      "beterraba",
      "brocolis",
      "cebola",
      "cenoura",
      "chuchu",
      "couve",
      "mandioca",
      "pepino",
      "pimentao",
      "repolho",
      "rucula",
      "tomate",
    ],
  },
  {
    category: "Carnes e Aves",
    terms: [
      "acem",
      "alcatra",
      "bacon",
      "bisteca",
      "carne",
      "contra file",
      "coxao",
      "frango",
      "file mignon",
      "linguica",
      "maminha",
      "moida",
      "patinho",
      "pernil",
      "picanha",
      "suina",
    ],
  },
  {
    category: "Peixaria",
    terms: ["atum fresco", "bacalhau", "camarao", "file de peixe", "merluza", "peixe", "salmao", "sardinha fresca", "tilapia"],
  },
  {
    category: "Laticinios",
    terms: [
      "coalhada",
      "creme de leite",
      "iogurte",
      "leite",
      "manteiga",
      "margarina",
      "queijo",
      "requeijao",
    ],
  },
  {
    category: "Frios",
    terms: ["apresuntado", "blanquet", "mortadela", "peito de peru", "presunto", "salame"],
  },
  {
    category: "Padaria",
    terms: ["bisnaguinha", "bolo", "broa", "croissant", "pao", "pao de forma", "pao frances", "torrada"],
  },
  {
    category: "Mercearia",
    terms: [
      "achocolatado",
      "acucar",
      "arroz",
      "azeite",
      "farinha",
      "feijao",
      "fuba",
      "oleo",
      "sal",
      "vinagre",
    ],
  },
  {
    category: "Massas",
    terms: ["capeletti", "espaguete", "lasanha seca", "macarrao", "massa", "nhoque", "penne"],
  },
  {
    category: "Bebidas",
    terms: ["agua", "cerveja", "cha", "energetico", "isotonico", "refrigerante", "suco", "vinho"],
  },
  {
    category: "Cafe da Manha",
    terms: ["aveia", "cafe", "cereal", "granola", "mel", "tapioca"],
  },
  {
    category: "Congelados",
    terms: ["batata congelada", "congelado", "hamburguer", "lasanha congelada", "nuggets", "pizza", "polpa"],
  },
  {
    category: "Enlatados e Conservas",
    terms: ["atum", "azeitona", "ervilha", "milho", "palmito", "sardinha", "seleta"],
  },
  {
    category: "Temperos e Molhos",
    terms: ["caldo", "catchup", "ketchup", "maionese", "molho", "mostarda", "oregano", "pimenta", "shoyu", "tempero"],
  },
  {
    category: "Snacks",
    terms: ["amendoim", "biscoito", "bolacha", "chocolate", "pipoca", "salgadinho", "snack"],
  },
  {
    category: "Higiene",
    terms: [
      "absorvente",
      "condicionador",
      "creme dental",
      "desodorante",
      "escova de dente",
      "fio dental",
      "papel higienico",
      "pasta de dente",
      "sabonete",
      "shampoo",
    ],
  },
  {
    category: "Limpeza",
    terms: [
      "agua sanitaria",
      "alvejante",
      "amaciante",
      "desinfetante",
      "detergente",
      "esponja",
      "lava roupas",
      "limpador",
      "sabao",
      "saco de lixo",
    ],
  },
  {
    category: "Pet",
    terms: ["areia gato", "bifinho", "petisco pet", "racao", "racao gato", "racao cachorro"],
  },
];

function normalizeCategoryTerm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeCategoryTerm(value)
    .split(" ")
    .filter((token) => token.length >= 3);
}

function buildStorageKey(householdId?: string | null) {
  return `${CATEGORY_OVERRIDE_STORAGE_PREFIX}.${householdId ?? "local"}`;
}

function parseOverrideMap(raw: string | null): CategoryOverrideMap {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const entries = Object.entries(parsed).filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === "string" && typeof entry[1] === "string",
    );
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export function loadCategoryOverrides(householdId?: string | null): CategoryOverrideMap {
  if (typeof window === "undefined") return {};
  return parseOverrideMap(window.localStorage.getItem(buildStorageKey(householdId)));
}

export function rememberCategoryOverride(
  householdId: string | null | undefined,
  productName: string,
  category: string,
): CategoryOverrideMap | null {
  const normalizedName = normalizeCategoryTerm(productName);
  const normalizedCategory = category.trim();

  if (!normalizedName || !normalizedCategory || typeof window === "undefined") {
    return null;
  }

  const storageKey = buildStorageKey(householdId);
  const nextOverrides = {
    ...parseOverrideMap(window.localStorage.getItem(storageKey)),
    [normalizedName]: normalizedCategory,
  };
  window.localStorage.setItem(storageKey, JSON.stringify(nextOverrides));
  return nextOverrides;
}

export function suggestCategoryForProduct(
  productName: string,
  overrides: CategoryOverrideMap = {},
): CategorySuggestion | null {
  const normalizedName = normalizeCategoryTerm(productName);
  if (!normalizedName) return null;

  const manualOverride = overrides[normalizedName];
  if (manualOverride) {
    return {
      category: manualOverride,
      confidence: 1,
      source: "manual_override",
      matchedTerm: normalizedName,
      kbVersion: CATEGORY_KB_VERSION,
    };
  }

  for (const entry of CATEGORY_KB) {
    for (const term of entry.terms) {
      const normalizedTerm = normalizeCategoryTerm(term);
      if (normalizedName === normalizedTerm) {
        return {
          category: entry.category,
          confidence: 0.98,
          source: "exact",
          matchedTerm: term,
          kbVersion: CATEGORY_KB_VERSION,
        };
      }
    }
  }

  for (const entry of CATEGORY_KB) {
    for (const term of entry.terms) {
      const normalizedTerm = normalizeCategoryTerm(term);
      if (
        normalizedTerm.length >= 4 &&
        (normalizedName.includes(normalizedTerm) || normalizedTerm.includes(normalizedName))
      ) {
        return {
          category: entry.category,
          confidence: 0.88,
          source: "alias",
          matchedTerm: term,
          kbVersion: CATEGORY_KB_VERSION,
        };
      }
    }
  }

  const productTokens = new Set(tokenize(normalizedName));
  for (const entry of CATEGORY_KB) {
    for (const term of entry.terms) {
      const termTokens = tokenize(term);
      if (termTokens.length && termTokens.every((token) => productTokens.has(token))) {
        return {
          category: entry.category,
          confidence: 0.74,
          source: "token",
          matchedTerm: term,
          kbVersion: CATEGORY_KB_VERSION,
        };
      }
    }
  }

  return {
    category: FALLBACK_CATEGORY,
    confidence: 0,
    source: "fallback",
    kbVersion: CATEGORY_KB_VERSION,
  };
}
