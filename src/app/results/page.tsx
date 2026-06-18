"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisResult, SafetyLevel } from "@/types";
import { saveAnalysisResult } from "@/lib/firebase";
import { Disclaimer } from "@/components/Disclaimer";

const safetyConfig: Record<SafetyLevel, { label: string; color: string; bg: string }> = {
  safe: { label: "安全", color: "text-emerald-400", bg: "bg-emerald-900/30 border-emerald-700" },
  caution: { label: "注意", color: "text-yellow-400", bg: "bg-yellow-900/30 border-yellow-700" },
  danger: { label: "危険", color: "text-red-400", bg: "bg-red-900/30 border-red-700" },
  unknown: { label: "不明", color: "text-gray-400", bg: "bg-gray-800 border-gray-700" },
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [productName, setProductName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showRaw, setShowRaw] = useState(false);
  const savedRef = useRef(false);

  // 会社名・商品名を含めて公開DBへ保存
  const save = useCallback((data: AnalysisResult, pName: string, mfr: string) => {
    setSaveStatus("saving");
    saveAnalysisResult({
      ...data,
      productName: pName.trim(),
      manufacturer: mfr.trim(),
    })
      .then(() => setSaveStatus("saved"))
      .catch(() => setSaveStatus("error"));
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem("lastResult");
    if (!stored) {
      router.push("/");
      return;
    }
    const parsed: AnalysisResult = JSON.parse(stored);
    setResult(parsed);
    const pName = parsed.productName?.trim() ?? "";
    const mfr = parsed.manufacturer?.trim() ?? "";
    setProductName(pName);
    setManufacturer(mfr);

    // 会社名と商品名が両方揃っているときだけ自動保存。欠けていれば保存せず入力を促す
    if (pName && mfr && !savedRef.current) {
      savedRef.current = true;
      save(parsed, pName, mfr);
    }
  }, [router, save]);

  if (!result) return null;

  const overallCfg = safetyConfig[result.overallSafety];
  const complete = productName.trim() !== "" && manufacturer.trim() !== "";

  const handleManualSave = () => {
    if (!complete) return;
    savedRef.current = true;
    save(result, productName, manufacturer);
  };

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
        {/* 参考情報・アレルギー注意の明記（常に最上部） */}
        <Disclaimer source={result.ingredientSource} />

        {/* 成分の出所バッジ */}
        <div className="flex items-center gap-2 text-xs">
          {result.ingredientSource === "label" && (
            <span className="px-2 py-1 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-700">
              📋 ラベルから読み取り
            </span>
          )}
          {result.ingredientSource === "estimated" && (
            <span className="px-2 py-1 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700">
              🔎 商品名から推定（実物と異なる場合あり）
            </span>
          )}
          {result.ingredientSource === "unknown" && (
            <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
              成分を特定できませんでした
            </span>
          )}
        </div>

        {/* 会社名・商品名（DB登録に必須） */}
        <div className="rounded-2xl border border-gray-700 bg-gray-900 px-4 py-4 flex flex-col gap-3">
          <p className="text-sm font-bold">登録情報（会社名・商品名）</p>

          <label className="text-xs text-gray-400 flex flex-col gap-1">
            会社名・メーカー
            <input
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="例: ○○食品株式会社"
              disabled={saveStatus === "saved"}
              className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600 disabled:opacity-60"
            />
          </label>

          <label className="text-xs text-gray-400 flex flex-col gap-1">
            商品名
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="例: ○○クッキー"
              disabled={saveStatus === "saved"}
              className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600 disabled:opacity-60"
            />
          </label>

          {saveStatus === "saved" ? (
            <p className="text-emerald-400 text-sm font-medium">✓ 公開DBに保存しました</p>
          ) : saveStatus === "saving" ? (
            <p className="text-gray-400 text-sm">保存中…</p>
          ) : (
            <>
              {!complete && (
                <p className="text-amber-300 text-xs leading-relaxed">
                  ⚠️ 公開DBに登録するには<strong>会社名</strong>と<strong>商品名</strong>の両方が必要です。
                  読み取れなかった部分を入力するか、その情報が写るように撮り直してください。
                </p>
              )}
              {saveStatus === "error" && (
                <p className="text-red-400 text-xs">保存に失敗しました。もう一度お試しください。</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleManualSave}
                  disabled={!complete}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 font-bold text-sm transition-colors"
                >
                  この内容で公開DBに保存
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:text-white text-sm"
                >
                  撮り直す
                </button>
              </div>
            </>
          )}
        </div>

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
        <div className="pb-8">
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
      </div>
    </main>
  );
}
