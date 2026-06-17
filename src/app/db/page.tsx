"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisResult, SafetyLevel } from "@/types";
import { getRecentScans } from "@/lib/firebase";

const safetyColors: Record<SafetyLevel, string> = {
  safe: "text-emerald-400",
  caution: "text-yellow-400",
  danger: "text-red-400",
  unknown: "text-gray-400",
};

const safetyBg: Record<SafetyLevel, string> = {
  safe: "bg-emerald-900/30 border-emerald-800",
  caution: "bg-yellow-900/30 border-yellow-800",
  danger: "bg-red-900/30 border-red-800",
  unknown: "bg-gray-800 border-gray-700",
};

const safetyLabels: Record<SafetyLevel, string> = {
  safe: "安全",
  caution: "注意",
  danger: "危険",
  unknown: "不明",
};

export default function DBPage() {
  const router = useRouter();
  const [scans, setScans] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getRecentScans(500)
      .then(setScans)
      .catch(() => setError("データの取得に失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = scans.filter(
    (s) =>
      s.productName?.toLowerCase().includes(search.toLowerCase()) ||
      s.ingredients?.some((i) => i.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white text-sm">
          ← 戻る
        </button>
        <span className="text-lg font-bold text-emerald-400">公開データベース</span>
        <div className="w-16" />
      </header>

      <div className="flex-1 flex flex-col px-4 py-6 gap-4 max-w-lg mx-auto w-full">
        <input
          type="text"
          placeholder="商品名・成分名で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600"
        />

        {loading && (
          <div className="text-center text-gray-500 py-12">読み込み中...</div>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <p className="text-xs text-gray-500">{filtered.length} 件のスキャンデータ・タップで全詳細</p>
        )}

        <div className="space-y-3 pb-8">
          {filtered.map((scan, i) => {
            const key = scan.id ?? String(i);
            const isOpen = expanded === key;
            return (
              <div
                key={key}
                onClick={() => setExpanded(isOpen ? null : key)}
                className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 cursor-pointer hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{scan.productName || "商品名不明"}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(scan.scannedAt).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <span className={`text-xs font-bold ${safetyColors[scan.overallSafety]}`}>
                    {safetyLabels[scan.overallSafety]}
                  </span>
                </div>

                <p className={`text-xs text-gray-400 mb-2 ${isOpen ? "" : "line-clamp-2"}`}>
                  {scan.summary}
                </p>

                {!isOpen && (
                  <div className="flex flex-wrap gap-1">
                    {scan.ingredients?.slice(0, 5).map((ing, j) => (
                      <span
                        key={j}
                        className={`text-xs px-2 py-0.5 rounded-full bg-gray-800 ${safetyColors[ing.safetyLevel]}`}
                      >
                        {ing.name}
                      </span>
                    ))}
                    {(scan.ingredients?.length ?? 0) > 5 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">
                        +{scan.ingredients.length - 5}
                      </span>
                    )}
                  </div>
                )}

                {isOpen && (
                  <div className="mt-3 flex flex-col gap-4">
                    {/* アレルゲン検出 */}
                    {scan.userAllergenMatches?.length > 0 && (
                      <div className="bg-red-900/40 border border-red-700 rounded-xl px-3 py-2">
                        <p className="text-red-300 text-xs font-bold">
                          ⚠️ アレルゲン: {scan.userAllergenMatches.join("、")}
                        </p>
                      </div>
                    )}

                    {/* 注意事項 */}
                    {scan.warnings?.length > 0 && (
                      <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl px-3 py-2">
                        <p className="text-yellow-400 text-xs font-medium mb-1">注意事項</p>
                        <ul className="space-y-0.5">
                          {scan.warnings.map((w, j) => (
                            <li key={j} className="text-yellow-200 text-xs">• {w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 全成分 */}
                    <div>
                      <p className="text-xs text-gray-400 mb-2">成分一覧（{scan.ingredients?.length ?? 0}件）</p>
                      <div className="space-y-1.5">
                        {scan.ingredients?.map((ing, j) => (
                          <div key={j} className={`rounded-lg border px-3 py-2 ${safetyBg[ing.safetyLevel]}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">{ing.name}</span>
                              <span className={`text-[10px] font-bold ${safetyColors[ing.safetyLevel]}`}>
                                {safetyLabels[ing.safetyLevel]}
                              </span>
                            </div>
                            {ing.description && (
                              <p className="text-[11px] text-gray-400 mt-0.5">{ing.description}</p>
                            )}
                            {ing.isAllergen && (
                              <p className="text-[11px] text-orange-400 mt-0.5">
                                アレルゲン: {ing.allergenTypes?.join("、")}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 生テキスト */}
                    {scan.rawText && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">読み取りテキスト</p>
                        <pre className="bg-gray-950 rounded-lg p-3 text-[11px] text-gray-500 whitespace-pre-wrap overflow-x-auto">
                          {scan.rawText}
                        </pre>
                      </div>
                    )}

                    <p className="text-[10px] text-gray-600 text-center">タップで閉じる</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
