import type { LucideIcon } from "lucide-react";
import {
  Apple,
  Beer,
  Beef,
  CakeSlice,
  Candy,
  Carrot,
  Cherry,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Drumstick,
  EggFried,
  Fish,
  GlassWater,
  Ham,
  IceCreamBowl,
  Citrus,
  Milk,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Soup,
  Utensils,
  Wheat,
  Wine,
} from "lucide-react";

type FoodIconRule = {
  icon: LucideIcon;
  keywords: string[];
  tone: "produce" | "protein" | "grain" | "treat" | "drink" | "fallback";
};

const FOOD_ICON_RULES: FoodIconRule[] = [
  // Protein sources (check before produce so "yogurt bowl" matches dairy, not "bowl" -> salad)
  { icon: EggFried, keywords: ["egg", "omelet", "omelette", "ei", "omelett", "rührei", "spiegelei", "ruehrei", "frittata", "quiche"], tone: "protein" },
  { icon: Fish, keywords: ["fish", "salmon", "tuna", "shrimp", "sushi", "seafood", "cod", "trout", "herring", "fisch", "lachs", "thunfisch", "garnele", "meeresfrüchte", "meeresfruchte", "kabeljau", "forelle", "hering", "matjes"], tone: "protein" },
  { icon: Drumstick, keywords: ["chicken", "turkey", "wings", "poultry", "hähnchen", "haehnchen", "huhn", "pute", "geflügel", "gefluegel", "hähnchenflügel"], tone: "protein" },
  { icon: Beef, keywords: ["beef", "steak", "meat", "pork", "lamb", "sausage", "rind", "fleisch", "schwein", "lamm", "hack", "schnitzel", "wurst", "bratwurst", "leberkäse", "leberkaese", "dörrfleisch"], tone: "protein" },
  { icon: Ham, keywords: ["ham", "prosciutto", "salami", "chorizo", "aufschnitt", "schinken", "speck", "bacon", "speckstreifen"], tone: "protein" },

  // Dairy (before produce so yogurt/cheese don't match salad)
  { icon: Milk, keywords: ["milk", "latte", "dairy", "cheese", "yogurt", "yoghurt", "cream", "butter", "joghurt", "milch", "käse", "kaese", "quark", "skyr", "sahne", "butter", "frischkäse", "frischkaese", "kefir"], tone: "drink" },

  // Grain / bread
  { icon: Wheat, keywords: ["bread", "toast", "pasta", "rice", "grain", "oats", "cereal", "noodle", "couscous", "quinoa", "brot", "nudel", "reis", "hafer", "müsli", "muesli", "porridge", "couscous", "vollkorn"], tone: "grain" },
  { icon: Croissant, keywords: ["croissant", "pastry", "bagel", "muffin", "pancake", "waffle", "pretzel", "brioche", "brötchen", "broetchen", "pfannkuchen", "waffel", "brezel", "gebäck", "gebaeck", "laugenbrezel", "sonntagsbrötchen"], tone: "grain" },
  { icon: Sandwich, keywords: ["sandwich", "burger", "wrap", "toastie", "döner", "doener", "kebab", "burrito", "taco", "falafel", "gyros", "baguette", "sub"], tone: "grain" },
  { icon: Pizza, keywords: ["pizza", "flatbread", "flammkuchen", "focaccia", "calzone"], tone: "grain" },

  // Produce
  { icon: Salad, keywords: ["salad", "salat", "bowl", "poke", "buddha", "coleslaw", "feldsalat", "rucola"], tone: "produce" },
  { icon: Cherry, keywords: ["cherry", "plum", "strawberry", "raspberry", "blueberry", "blackberry", "kirschen", "kirsche", "pflaume", "erdbeere", "himbeere", "heidelbeere", "brombeere", "johannisbeere"], tone: "produce" },
  { icon: Citrus, keywords: ["lemon", "lime", "citrus", "grapefruit", "zitrone", "limette", "grapefruit", "zitrus", "mandarine", "clementine"], tone: "produce" },
  { icon: Apple, keywords: ["apple", "banana", "berry", "berries", "fruit", "orange", "pear", "grape", "melon", "peach", "apricot", "apfel", "banane", "beere", "obst", "birne", "traube", "mango", "ananas", "melone", "pfirsich", "aprikose", "kiwi", "papaya"], tone: "produce" },
  { icon: Carrot, keywords: ["carrot", "broccoli", "vegetable", "veggie", "spinach", "avocado", "greens", "pepper", "tomato", "cucumber", "zucchini", "mushroom", "onion", "garlic", "möhre", "moehre", "karotte", "brokkoli", "gemüse", "gemuese", "spinat", "paprika", "tomate", "gurke", "zucchini", "pilz", "zwiebel", "knoblauch", "sellerie", "lauch"], tone: "produce" },

  // Drinks
  { icon: Coffee, keywords: ["coffee", "espresso", "cappuccino", "latte macchiato", "americano", "kaffee", "filterkaffee"], tone: "drink" },
  { icon: Wine, keywords: ["wine", "champagne", "prosecco", "sekt", "wein", "rotwein", "weißwein", "weisswein", "rosé", "rose", "sekt", "champagner"], tone: "drink" },
  { icon: Beer, keywords: ["beer", "ale", "lager", "stout", "bier", "weizen", "pils", "hefeweizen", "radler"], tone: "drink" },
  { icon: GlassWater, keywords: ["water", "mineral water", "sparkling water", "wasser", "mineralwasser", "sprudel", "leitungswasser"], tone: "drink" },
  { icon: CupSoda, keywords: ["drink", "juice", "soda", "cola", "tea", "saft", "tee", "schorle", "limo", "getränk", "getraenk", "smoothie", "limonade", "eistee", "matcha"], tone: "drink" },

  // Snacks
  { icon: Popcorn, keywords: ["popcorn", "chips", "snack", "nachos", "pretzels", "crackers", "knabbergebäck", "knabbergebaeck", "salzstangen", "erdnussflips"], tone: "treat" },
  { icon: Cookie, keywords: ["cookie", "keks", "shortbread", "biscuit", "spekulatius", "lebkuchen", "plätzchen", "plaetzchen"], tone: "treat" },
  { icon: CakeSlice, keywords: ["cake", "tart", "cheesecake", "pie", "tiramisu", "kuchen", "torte", "käsekuchen", "kaesekuchen", "obsttorte", "tiramisu", "sachertorte", "schwarzwälder", "schwarzwaelder"], tone: "treat" },

  // Treats
  { icon: IceCreamBowl, keywords: ["ice cream", "gelato", "dessert", "frozen yogurt", "sorbet", "eis", "eiscreme", "nachtisch", "softeis", "frozen"], tone: "treat" },
  { icon: Candy, keywords: ["candy", "chocolate", "brownie", "sweet", "praline", "schokolade", "süß", "suess", "bonbon", "gummibärchen", "gummibaerchen", "schokoriegel", "praline", "marzipan", "nougatcreme"], tone: "treat" },

  // Soups
  { icon: Soup, keywords: ["soup", "ramen", "stew", "broth", "bisque", "suppe", "eintopf", "brühe", "bruehe", "curry", "gulasch", "chili", "gazpacho", "boullion", "bouillon"], tone: "fallback" },

  // Generic
  { icon: Utensils, keywords: ["meal", "dish", "plate", "mahlzeit", "gericht", "teller", "essen"], tone: "fallback" },
];

function normalizeMealText(input: string | null | undefined): string {
  return input?.toLowerCase().replace(/[^a-zäöüß0-9\s]+/g, " ").replace(/\s+/g, " ").trim() ?? "";
}

export function getFoodIcon(sourceTexts: Array<string | null | undefined>): LucideIcon {
  const haystack = sourceTexts
    .map((value) => normalizeMealText(value))
    .filter(Boolean)
    .join(" ");

  for (const rule of FOOD_ICON_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.icon;
    }
  }

  return Utensils;
}

export function getFoodIconTone(sourceTexts: Array<string | null | undefined>): FoodIconRule["tone"] {
  const haystack = sourceTexts
    .map((value) => normalizeMealText(value))
    .filter(Boolean)
    .join(" ");

  for (const rule of FOOD_ICON_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.tone;
    }
  }

  return "fallback";
}
