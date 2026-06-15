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

  useEffect(() => {
    getRecentScans(50)
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
          <p className="text-xs text-gray-500">{filtered.length} 件のスキャンデータ</p>
        )}

        <div className="space-y-3 pb-8">
          {filtered.map((scan, i) => (
            <div key={scan.id ?? i} className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">{scan.productName || "商品名不明"}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(scan.scannedAt).toLocaleDateString("ja-JP")}
                  </p>
                </div>
                <span className={`text-xs font-bold ${safetyColors[scan.overallSafety]}`}>
                  {safetyLabels[scan.overallSafety]}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-2 line-clamp-2">{scan.summary}</p>
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
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
