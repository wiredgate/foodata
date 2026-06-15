import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
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

export async function saveAnalysisResult(result: AnalysisResult): Promise<string> {
  const docRef = await addDoc(collection(db, "scans"), {
    ...result,
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
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    scannedAt:
      doc.data().scannedAt instanceof Timestamp
        ? doc.data().scannedAt.toDate().toISOString()
        : doc.data().scannedAt,
  })) as AnalysisResult[];
}
