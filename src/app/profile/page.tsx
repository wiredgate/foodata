"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { COMMON_ALLERGENS } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("userAllergens");
    if (stored) setSelected(JSON.parse(stored));
  }, []);

  const toggle = (allergen: string) => {
    setSelected((prev) =>
      prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen]
    );
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem("userAllergens", JSON.stringify(selected));
    setSaved(true);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white text-sm">
          ← 戻る
        </button>
        <span className="text-lg font-bold text-emerald-400">アレルギー設定</span>
        <div className="w-16" />
      </header>

      <div className="flex-1 flex flex-col px-4 py-6 gap-6 max-w-lg mx-auto w-full">
        <div>
          <p className="text-gray-400 text-sm">
            該当するアレルゲンをタップして選択してください。スキャン時に自動で警告します。
          </p>
        </div>

        {selected.length > 0 && (
          <div className="bg-orange-900/20 border border-orange-800 rounded-2xl px-4 py-3">
            <p className="text-orange-400 text-xs mb-2 font-medium">設定中のアレルゲン</p>
            <div className="flex flex-wrap gap-2">
              {selected.map((a) => (
                <span key={a} className="bg-orange-900/50 border border-orange-700 text-orange-300 text-xs px-2 py-1 rounded-full">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs text-gray-500 mb-3">アレルゲン一覧（複数選択可）</p>
          <div className="flex flex-wrap gap-2">
            {COMMON_ALLERGENS.map((allergen) => {
              const isSelected = selected.includes(allergen);
              return (
                <button
                  key={allergen}
                  onClick={() => toggle(allergen)}
                  className={`px-3 py-2 rounded-full text-sm border transition-colors ${
                    isSelected
                      ? "bg-emerald-500 border-emerald-400 text-white font-medium"
                      : "bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  {allergen}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pb-8">
          <button
            onClick={handleSave}
            className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 font-bold text-lg transition-colors"
          >
            {saved ? "✓ 保存しました" : "設定を保存"}
          </button>
        </div>
      </div>
    </main>
  );
}
