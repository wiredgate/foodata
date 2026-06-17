import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import type { AnalysisResult } from "@/types";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ---- 認証（Googleログイン必須） ----
export function signInWithGoogle(): Promise<void> {
  return signInWithPopup(auth, googleProvider).then(() => undefined);
}

export function signOutUser(): Promise<void> {
  return signOut(auth);
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// ---- スキャン結果の保存（ログイン必須・投稿者を記録） ----
export async function saveAnalysisResult(result: AnalysisResult): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("ログインが必要です");

  const docRef = await addDoc(collection(db, "scans"), {
    ...result,
    ownerId: user.uid,
    ownerName: user.displayName ?? "名称未設定",
    scannedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getRecentScans(count = 20): Promise<AnalysisResult[]> {
  const q = query(
    collection(db, "scans"),
    orderBy("scannedAt", "desc"),
    limit(count)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    scannedAt:
      d.data().scannedAt instanceof Timestamp
        ? d.data().scannedAt.toDate().toISOString()
        : d.data().scannedAt,
  })) as AnalysisResult[];
}

// ---- 自分の投稿の削除（ルールで本人のみ許可） ----
export async function deleteScan(scanId: string): Promise<void> {
  if (!auth.currentUser) throw new Error("ログインが必要です");
  await deleteDoc(doc(db, "scans", scanId));
}

// ---- 通報（虚偽・捏造の疑いを運営へ） ----
export async function reportScan(
  scan: AnalysisResult,
  reason: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("ログインが必要です");

  await addDoc(collection(db, "reports"), {
    scanId: scan.id ?? null,
    scanOwnerId: scan.ownerId ?? null,
    productName: scan.productName ?? null,
    reason,
    reporterId: user.uid,
    reporterName: user.displayName ?? "名称未設定",
    createdAt: Timestamp.now(),
  });
}
