import type { LucideIcon } from "lucide-react";
import {
  Apple,
  Beef,
  Candy,
  Carrot,
  Coffee,
  Croissant,
  CupSoda,
  Drumstick,
  EggFried,
  Fish,
  IceCreamBowl,
  Milk,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  Utensils,
  Wheat,
} from "lucide-react";

type FoodIconRule = {
  icon: LucideIcon;
  keywords: string[];
  tone: "produce" | "protein" | "grain" | "treat" | "drink" | "fallback";
};

const FOOD_ICON_RULES: FoodIconRule[] = [
  { icon: Apple, keywords: ["apple", "banana", "berry", "berries", "fruit", "orange", "pear", "grape"], tone: "produce" },
  { icon: Carrot, keywords: ["carrot", "broccoli", "vegetable", "veggie", "spinach", "avocado", "greens", "pepper"], tone: "produce" },
  { icon: Salad, keywords: ["salad", "bowl", "yogurt", "oat", "granola", "smoothie"], tone: "produce" },
  { icon: Wheat, keywords: ["bread", "toast", "pasta", "rice", "grain", "oats", "cereal"], tone: "grain" },
  { icon: Croissant, keywords: ["croissant", "pastry", "bagel", "muffin", "breakfast"], tone: "grain" },
  { icon: Sandwich, keywords: ["sandwich", "burger", "wrap", "toastie"], tone: "grain" },
  { icon: Pizza, keywords: ["pizza", "flatbread"], tone: "grain" },
  { icon: EggFried, keywords: ["egg", "omelet", "omelette"], tone: "protein" },
  { icon: Fish, keywords: ["fish", "salmon", "tuna", "shrimp", "sushi"], tone: "protein" },
  { icon: Drumstick, keywords: ["chicken", "turkey", "wings"], tone: "protein" },
  { icon: Beef, keywords: ["beef", "steak", "meat", "pork", "lamb"], tone: "protein" },
  { icon: Milk, keywords: ["milk", "latte", "dairy", "cheese"], tone: "drink" },
  { icon: Coffee, keywords: ["coffee", "espresso", "cappuccino"], tone: "drink" },
  { icon: CupSoda, keywords: ["drink", "juice", "soda", "cola", "tea", "water"], tone: "drink" },
  { icon: IceCreamBowl, keywords: ["ice cream", "gelato", "dessert", "frozen yogurt"], tone: "treat" },
  { icon: Candy, keywords: ["candy", "chocolate", "cookie", "cake", "brownie", "sweet"], tone: "treat" },
  { icon: Soup, keywords: ["soup", "ramen", "stew", "broth"], tone: "fallback" },
  { icon: Utensils, keywords: ["meal", "dish", "plate"], tone: "fallback" },
];

function normalizeMealText(input: string | null | undefined): string {
  return input?.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim() ?? "";
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
