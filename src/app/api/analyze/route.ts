import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import type { AnalysisResult } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

    const prompt = `あなたは食品・化粧品・医薬品・洗剤・日用品など、あらゆる製品の成分分析の専門家です。この画像に写っている原材料表示・成分表示・成分リストを読み取り、以下のJSON形式で返してください。

${allergenInstruction}

返すJSONの形式:
{
  "productName": "商品名（読み取れる場合）",
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

成分表示が見当たらない場合も、見える全てのテキストをrawTextに記録してください。
必ずJSON形式のみで返し、前後に説明文は不要です。`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
