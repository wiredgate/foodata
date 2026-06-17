import type { IngredientSource } from "@/types";

// 全画面共通の注意書き。成分は参考情報であり実物と異なる場合がある旨、
// 特にアレルギーは必ず実物を確認すべき旨を明記する。
export function Disclaimer({ source }: { source?: IngredientSource }) {
  return (
    <div className="w-full bg-amber-900/30 border border-amber-600 rounded-xl px-4 py-3 text-amber-100 text-xs leading-relaxed">
      <p className="font-bold text-amber-300 mb-1">⚠️ 表示は「参考情報」です</p>
      <p>
        商品の特定や成分には推定が含まれ、<strong>実際の製品と内容が異なる場合があります</strong>。
        あくまで参考としてご利用ください。
      </p>
      <p className="mt-1 text-amber-50">
        <strong>
          特にアレルギーがある方は、必ず実物のパッケージの原材料表示をご自身で確認してください。
        </strong>
        本アプリの情報だけで摂取を判断しないでください。
      </p>
      {source === "estimated" && (
        <p className="mt-1 text-amber-300">
          ※ この結果はラベルではなく<strong>商品名からの推定</strong>です。実物と異なる可能性が高いため、必ずご確認ください。
        </p>
      )}
    </div>
  );
}
