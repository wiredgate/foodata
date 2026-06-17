"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisResult } from "@/types";

export default function ScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 撮影したら即・自動で分析して結果ページへ（ボタン操作なし）
  const runAnalysis = useCallback(
    async (imageBase64: string, mediaType: string) => {
      setLoading(true);
      setError(null);
      try {
        const savedAllergens = localStorage.getItem("userAllergens");
        const userAllergens = savedAllergens ? JSON.parse(savedAllergens) : [];

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64, mediaType, userAllergens }),
        });

        if (!res.ok) throw new Error("分析に失敗しました");

        const result: AnalysisResult = await res.json();
        sessionStorage.setItem("lastResult", JSON.stringify(result));
        router.push("/results");
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
        setLoading(false);
      }
    },
    [router]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const mediaType = file.type || "image/jpeg";
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setPreview(dataUrl);
        const base64 = dataUrl.split(",")[1];
        runAnalysis(base64, mediaType);
      };
      reader.readAsDataURL(file);
      setError(null);
    },
    [runAnalysis]
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔬</span>
          <span className="text-xl font-bold text-emerald-400">Foodata</span>
        </div>
        <nav className="flex gap-3 text-sm">
          <a href="/db" className="text-gray-400 hover:text-white">DB</a>
          <a href="/profile" className="text-gray-400 hover:text-white">プロフィール</a>
        </nav>
      </header>

      <div className="flex-1 flex flex-col items-center px-4 py-8 gap-6 max-w-lg mx-auto w-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-1">成分スキャン</h1>
          <p className="text-gray-400 text-sm">撮影するだけで自動で分析します</p>
        </div>

        <div
          onClick={() => !loading && fileInputRef.current?.click()}
          className={`relative w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-700 bg-gray-900 flex flex-col items-center justify-center overflow-hidden transition-colors ${
            loading ? "cursor-default" : "cursor-pointer hover:border-emerald-500"
          }`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="撮影画像" className="w-full h-full object-contain" />
          ) : (
            <>
              <span className="text-5xl mb-3">📷</span>
              <p className="text-gray-400 text-sm">タップして撮影</p>
            </>
          )}

          {loading && (
            <div className="absolute inset-0 bg-gray-950/80 flex flex-col items-center justify-center gap-3">
              <span className="animate-spin text-3xl">⏳</span>
              <p className="text-emerald-400 font-bold">分析中...</p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {error && (
          <div className="w-full bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm flex flex-col gap-2">
            <span>{error}</span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="self-start text-emerald-400 underline text-xs"
            >
              もう一度撮影する
            </button>
          </div>
        )}

        {!loading && !error && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 font-bold text-lg transition-colors"
          >
            📷 撮影して分析する
          </button>
        )}

        <p className="text-xs text-gray-600 text-center">
          読み取ったデータは公開データベースに保存されます
        </p>
      </div>
    </main>
  );
}
