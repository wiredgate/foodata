"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisResult, SafetyLevel } from "@/types";
import { saveAnalysisResult } from "@/lib/firebase";

const safetyConfig: Record<SafetyLevel, { label: string; color: string; bg: string }> = {
  safe: { label: "安全", color: "text-emerald-400", bg: "bg-emerald-900/30 border-emerald-700" },
  caution: { label: "注意", color: "text-yellow-400", bg: "bg-yellow-900/30 border-yellow-700" },
  danger: { label: "危険", color: "text-red-400", bg: "bg-red-900/30 border-red-700" },
  unknown: { label: "不明", color: "text-gray-400", bg: "bg-gray-800 border-gray-700" },
};

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("lastResult");
    if (!stored) {
      router.push("/");
      return;
    }
    setResult(JSON.parse(stored));
  }, [router]);

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveAnalysisResult(result);
      setSaved(true);
    } catch {
      setSaveError("保存に失敗しました。Firebase の設定を確認してください。");
    } finally {
      setSaving(false);
    }
  };

  if (!result) return null;

  const overallCfg = safetyConfig[result.overallSafety];

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
          ← スキャンに戻る
        </button>
        <span className="text-lg font-bold text-emerald-400">分析結果</span>
        <div className="w-16" />
      </header>

      <div className="flex-1 flex flex-col px-4 py-6 gap-5 max-w-lg mx-auto w-full">
        {/* Allergen Alert */}
        {result.userAllergenMatches.length > 0 && (
          <div className="bg-red-900/50 border-2 border-red-500 rounded-2xl px-4 py-4">
            <p className="text-red-300 font-bold text-lg mb-1">⚠️ アレルゲン検出！</p>
            <p className="text-red-200 text-sm">
              あなたのアレルゲン: <strong>{result.userAllergenMatches.join("、")}</strong> が含まれています
            </p>
          </div>
        )}

        {/* Overall Safety */}
        <div className={`rounded-2xl border px-4 py-4 ${overallCfg.bg}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400">総合評価</span>
            <span className={`font-bold text-lg ${overallCfg.color}`}>{overallCfg.label}</span>
          </div>
          <p className="text-sm text-gray-300">{result.summary}</p>
        </div>

        {/* Product Name */}
        {result.productName && (
          <div>
            <p className="text-xs text-gray-500 mb-1">商品名</p>
            <p className="font-medium">{result.productName}</p>
          </div>
        )}

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-2xl px-4 py-3">
            <p className="text-yellow-400 font-medium text-sm mb-2">注意事項</p>
            <ul className="space-y-1">
              {result.warnings.map((w, i) => (
                <li key={i} className="text-yellow-200 text-sm">• {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Ingredients */}
        <div>
          <p className="text-sm text-gray-400 mb-3">成分一覧（{result.ingredients.length}件）</p>
          <div className="space-y-2">
            {result.ingredients.map((ing, i) => {
              const cfg = safetyConfig[ing.safetyLevel];
              return (
                <div key={i} className={`rounded-xl border px-3 py-3 ${cfg.bg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{ing.name}</span>
                    <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-gray-400">{ing.description}</p>
                  {ing.isAllergen && (
                    <p className="text-xs text-orange-400 mt-1">
                      アレルゲン: {ing.allergenTypes.join("、")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Raw text toggle */}
        <div>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs text-gray-500 hover:text-gray-300 underline"
          >
            {showRaw ? "生テキストを隠す" : "読み取った生テキストを表示"}
          </button>
          {showRaw && (
            <pre className="mt-2 bg-gray-900 rounded-xl p-3 text-xs text-gray-400 whitespace-pre-wrap overflow-x-auto">
              {result.rawText}
            </pre>
          )}
        </div>

        {/* Save to DB */}
        <div className="pb-8">
          {saveError && (
            <p className="text-red-400 text-xs mb-2">{saveError}</p>
          )}
          {saved ? (
            <div className="w-full py-3 rounded-2xl bg-gray-800 text-emerald-400 text-center font-medium">
              ✓ データベースに保存しました
            </div>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 font-bold transition-colors"
            >
              {saving ? "保存中..." : "公開DBに保存する"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
