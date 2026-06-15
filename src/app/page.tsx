"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisResult } from "@/types";

export default function ScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaType(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
    setError(null);
  }, []);

  const handleAnalyze = async () => {
    if (!imageBase64) return;
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
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-gray-400 text-sm">食品・化粧品・洗剤・薬など、成分表示があるものはなんでも</p>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-700 bg-gray-900 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors overflow-hidden"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="撮影画像" className="w-full h-full object-contain" />
          ) : (
            <>
              <span className="text-5xl mb-3">📷</span>
              <p className="text-gray-400 text-sm">タップして撮影 / 画像を選択</p>
            </>
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
          <div className="w-full bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleAnalyze}
            disabled={!imageBase64 || loading}
            className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 font-bold text-lg transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin inline-block">⏳</span> 分析中...
              </span>
            ) : (
              "成分を分析する"
            )}
          </button>

          {preview && (
            <button
              onClick={() => {
                setPreview(null);
                setImageBase64(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="w-full py-3 rounded-2xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
            >
              やり直す
            </button>
          )}
        </div>

        <p className="text-xs text-gray-600 text-center">
          読み取ったデータは公開データベースに保存されます
        </p>
      </div>
    </main>
  );
}
