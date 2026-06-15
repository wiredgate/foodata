export type SafetyLevel = "safe" | "caution" | "danger" | "unknown";

export interface Ingredient {
  name: string;
  safetyLevel: SafetyLevel;
  description: string;
  isAllergen: boolean;
  allergenTypes: string[];
}

export interface AnalysisResult {
  id?: string;
  productName: string;
  rawText: string;
  ingredients: Ingredient[];
  overallSafety: SafetyLevel;
  summary: string;
  warnings: string[];
  imageUrl?: string;
  scannedAt: string;
  userAllergenMatches: string[];
}

export interface UserProfile {
  allergens: string[];
}

export const COMMON_ALLERGENS = [
  "卵",
  "乳",
  "小麦",
  "えび",
  "かに",
  "落花生",
  "そば",
  "あわび",
  "いか",
  "いくら",
  "オレンジ",
  "カシューナッツ",
  "キウイフルーツ",
  "牛肉",
  "くるみ",
  "ごま",
  "さけ",
  "さば",
  "大豆",
  "鶏肉",
  "バナナ",
  "豚肉",
  "まつたけ",
  "もも",
  "やまいも",
  "りんご",
  "ゼラチン",
  "アーモンド",
  "パルプ",
] as const;
