import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import type { AnalysisResult } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Vercel の関数タイムアウト上限を 60 秒に（無料プランの最大）
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mediaType, userAllergens = [] } = body;

    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ error: "画像データが必要です" }, { status: 400 });
    }

    const allergenInstruction =
      userAllergens.length > 0
        ? `ユーザーは以下のアレルゲンに注意が必要です: ${userAllergens.join("、")}。これらが成分に含まれる場合は必ず警告してください。`
        : "";

    const prompt = `あなたは食品・化粧品・医薬品・洗剤・日用品など、あらゆる製品の成分分析の専門家です。画像を見て、その製品の成分を分析し、以下のJSON形式で返してください。

${allergenInstruction}

【成分の判定手順】
1. 画像に原材料表示・成分表示が写っていて読み取れる場合 → そのラベルの内容を成分とする。ingredientSource は "label"。
2. ラベルが読み取れないが、写っている製品（ブランド名・商品名・パッケージ）から具体的な商品を特定できる場合 → 一般に知られているその商品の代表的な成分を記載する。ingredientSource は "estimated"、productIdentified は true。
3. ラベルも読めず商品も特定できない場合 → ingredients は空配列、ingredientSource は "unknown"、productIdentified は false。

重要: "estimated"（推定）の場合、実際の製品とは成分が異なる可能性が高いことを踏まえ、断定を避け、summary と warnings に「商品名から推定したもので実物と異なる場合がある」旨を必ず含めること。アレルゲンについても推定であることを明記すること。

会社名（メーカー・製造者・販売者）も必ず探してください。ラベルに「製造者」「販売者」「○○株式会社」等があればそれを、無ければ商品やブランドから一般に知られている製造・販売会社名を推定してください。不明な場合は空文字にしてください。

返すJSONの形式:
{
  "productName": "商品名（特定できた場合。ブランド名も含める）",
  "manufacturer": "会社名・メーカー名（製造者/販売者。特定・推定できた場合。不明なら空文字）",
  "productIdentified": true|false,
  "ingredientSource": "label|estimated|unknown",
  "rawText": "画像から読み取った全テキスト（できる限り全て）",
  "ingredients": [
    {
      "name": "成分名",
      "safetyLevel": "safe|caution|danger|unknown",
      "description": "この成分についての説明（50文字以内）",
      "isAllergen": true|false,
      "allergenTypes": ["該当するアレルゲン名"]
    }
  ],
  "overallSafety": "safe|caution|danger|unknown",
  "summary": "全体的な安全性の要約（100文字以内）",
  "warnings": ["警告事項1", "警告事項2"]
}

safetyLevel の基準:
- safe: 一般的に安全とされる成分
- caution: 過剰摂取や特定の人に注意が必要
- danger: 発がん性・毒性・強いアレルゲン性が報告されている
- unknown: 情報が不十分

見える全てのテキストを rawText に記録してください。
必ずJSON形式のみで返し、前後に説明文は不要です。`;

    // thinkingConfig で思考モードを無効化し、レスポンスを高速化（OCR用途では不要）
    // 旧 SDK の型に thinkingConfig が無いため、オブジェクトごとキャストして素通しさせる
    const generationConfig = {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    } as GenerationConfig;

    const model = genAI.getGenerativeModel(
      { model: "gemini-2.5-flash", generationConfig },
      { timeout: 55000 }
    );

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mediaType,
          data: imageBase64,
        },
      },
    ]);

    const text = result.response.text();
    const jsonText = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(jsonText);

    const userAllergenMatches = (userAllergens as string[]).filter((allergen) =>
      parsed.ingredients?.some(
        (ing: { name: string; allergenTypes: string[] }) =>
          ing.name.includes(allergen) ||
          ing.allergenTypes?.some((a: string) => a.includes(allergen))
      )
    );

    const analysisResult: AnalysisResult = {
      ...parsed,
      productName: parsed.productName ?? "",
      manufacturer: parsed.manufacturer ?? "",
      productIdentified: parsed.productIdentified ?? false,
      ingredientSource: parsed.ingredientSource ?? "unknown",
      userAllergenMatches,
      scannedAt: new Date().toISOString(),
    };

    return NextResponse.json(analysisResult);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Analysis error:", msg);
    return NextResponse.json(
      { error: "分析に失敗しました。もう一度お試しください。", detail: msg },
      { status: 500 }
    );
  }
}
