"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Report, BannedUser } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import {
  getReports,
  deleteReport,
  banUser,
  unbanUser,
  getBannedUsers,
  deleteScan,
} from "@/lib/firebase";

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdmin, signIn } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [banned, setBanned] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, b] = await Promise.all([getReports(), getBannedUsers()]);
      setReports(r);
      setBanned(b);
    } catch {
      setError("データの取得に失敗しました。ルールが未更新の可能性があります。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const handleBan = async (report: Report) => {
    if (!report.scanOwnerId) {
      alert("この通報には投稿者情報がありません。");
      return;
    }
    if (!window.confirm(`このユーザーをBANしますか？\n${report.scanOwnerId}\n以後このユーザーは投稿できなくなります。`)) return;
    setBusy(report.id ?? null);
    try {
      await banUser(report.scanOwnerId, {
        name: report.productName ? `投稿: ${report.productName}` : null,
        reason: report.reason,
      });
      await getBannedUsers().then(setBanned);
      alert("BANしました。");
    } catch {
      alert("BANに失敗しました。");
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteScan = async (report: Report) => {
    if (!report.scanId) {
      alert("この通報には投稿IDがありません。");
      return;
    }
    if (!window.confirm("この投稿を削除しますか？（元に戻せません）")) return;
    setBusy(report.id ?? null);
    try {
      await deleteScan(report.scanId);
      alert("投稿を削除しました。");
    } catch {
      alert("削除に失敗しました。");
    } finally {
      setBusy(null);
    }
  };

  const handleResolve = async (report: Report) => {
    if (!report.id) return;
    setBusy(report.id);
    try {
      await deleteReport(report.id);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch {
      alert("通報の処理に失敗しました。");
    } finally {
      setBusy(null);
    }
  };

  const handleUnban = async (uid: string) => {
    if (!window.confirm("BANを解除しますか？")) return;
    setBusy(uid);
    try {
      await unbanUser(uid);
      setBanned((prev) => prev.filter((b) => b.uid !== uid));
    } catch {
      alert("解除に失敗しました。");
    } finally {
      setBusy(null);
    }
  };

  const Header = (
    <header className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
      <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white text-sm">
        ← 戻る
      </button>
      <span className="text-lg font-bold text-emerald-400">管理者</span>
      <div className="w-16" />
    </header>
  );

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <span className="animate-spin text-3xl">⏳</span>
      </main>
    );
  }

  // 未ログイン
  if (!user) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col">
        {Header}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-gray-400">管理者ページにはログインが必要です。</p>
          <button
            onClick={() => signIn().catch(() => {})}
            className="py-3 px-6 rounded-2xl bg-white text-gray-900 font-bold"
          >
            Google でログイン
          </button>
        </div>
      </main>
    );
  }

  // ログイン済みだが管理者でない → uID を表示して初回登録を案内
  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col">
        {Header}
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 max-w-md mx-auto text-center">
          <span className="text-5xl">🔒</span>
          <p className="text-gray-300 font-bold">管理者権限がありません</p>
          <div className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-left">
            <p className="text-xs text-gray-500 mb-1">あなたのユーザーID</p>
            <p className="text-sm font-mono break-all text-emerald-300">{user.uid}</p>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(user.uid);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="mt-2 text-xs text-emerald-400 underline"
            >
              {copied ? "コピーしました" : "IDをコピー"}
            </button>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed text-left">
            初めて管理者を設定する場合: Firestore の <strong>admins</strong> コレクションに、
            上のIDを<strong>ドキュメントID</strong>にした空ドキュメントを1件作成してください。
            一度設定すれば、以後はこのページで管理できます。
          </p>
        </div>
      </main>
    );
  }

  // 管理者画面
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      {Header}
      <div className="flex-1 flex flex-col px-4 py-6 gap-6 max-w-lg mx-auto w-full">
        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* 通報一覧 */}
        <section>
          <h2 className="text-sm font-bold text-gray-300 mb-3">
            🚩 通報一覧（{reports.length}件）
          </h2>
          {loading ? (
            <p className="text-gray-500 text-sm">読み込み中...</p>
          ) : reports.length === 0 ? (
            <p className="text-gray-600 text-sm">通報はありません。</p>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-sm">{r.productName || "（商品名なし）"}</p>
                    <span className="text-[10px] text-gray-500">
                      {new Date(r.createdAt).toLocaleString("ja-JP")}
                    </span>
                  </div>
                  <p className="text-xs text-amber-300 mb-2">理由: {r.reason}</p>
                  <p className="text-[11px] text-gray-500 break-all mb-1">
                    投稿者ID: {r.scanOwnerId || "不明"}
                  </p>
                  <p className="text-[11px] text-gray-500 break-all mb-3">
                    通報者: {r.reporterName}（{r.reporterId}）
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleDeleteScan(r)}
                      disabled={busy === r.id}
                      className="text-xs px-3 py-1.5 rounded-full border border-red-700 text-red-300 hover:bg-red-900/30 disabled:opacity-50"
                    >
                      🗑 投稿を削除
                    </button>
                    <button
                      onClick={() => handleBan(r)}
                      disabled={busy === r.id}
                      className="text-xs px-3 py-1.5 rounded-full border border-red-700 text-red-300 hover:bg-red-900/30 disabled:opacity-50"
                    >
                      🚫 投稿者をBAN
                    </button>
                    <button
                      onClick={() => handleResolve(r)}
                      disabled={busy === r.id}
                      className="text-xs px-3 py-1.5 rounded-full border border-gray-600 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                    >
                      ✓ 対応済み（通報を消す）
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* BAN中ユーザー */}
        <section>
          <h2 className="text-sm font-bold text-gray-300 mb-3">
            🚫 BAN中のユーザー（{banned.length}人）
          </h2>
          {banned.length === 0 ? (
            <p className="text-gray-600 text-sm">なし</p>
          ) : (
            <div className="space-y-2">
              {banned.map((b) => (
                <div
                  key={b.uid}
                  className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-3 flex justify-between items-center gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400 break-all">{b.uid}</p>
                    {b.reason && <p className="text-[11px] text-gray-600">理由: {b.reason}</p>}
                  </div>
                  <button
                    onClick={() => handleUnban(b.uid)}
                    disabled={busy === b.uid}
                    className="text-xs px-3 py-1.5 rounded-full border border-emerald-700 text-emerald-300 hover:bg-emerald-900/30 disabled:opacity-50 shrink-0"
                  >
                    解除
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
