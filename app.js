// app.js
// Inisialisasi Firebase & shared logic untuk FUPA Snack

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// --------------
// Konfigurasi
// --------------
export const firebaseConfig = {
  apiKey: "AIzaSyCt8OGr4HlmbjdxB0cSbm3_vkzm2NA3AXU",
  authDomain: "presensi-2bbde.firebaseapp.com",
  projectId: "presensi-2bbde",
  storageBucket: "presensi-2bbde.firebasestorage.app",
  messagingSenderId: "853002288058",
  appId: "1:853002288058:web:a276789416fecf2b733b83",
  measurementId: "G-Y1F50VXBDD"
};

export const CLOUDINARY = {
  name: "dn2o2vf04",
  uploadPreset: "presensi_unsigned",
  url: "https://api.cloudinary.com/v1_1/dn2o2vf04/image/upload"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Atur persistence sesi
setPersistence(auth, browserLocalPersistence).catch(() => {});

// Email-role mapping
const ADMIN_EMAILS = new Set([
  "karomi@fupa.id",
  "annisa@fupa.id"
]);
const KARYAWAN_EMAILS = new Set([
  "cabang1@fupa.id",
  "cabang2@fupa.id",
  "cabang3@fupa.id",
  "cabang4@fupa.id"
]);

// --------------
// Utilitas umum
// --------------
export function toast({ type = "info", message = "" }) {
  const wrap = document.getElementById("toasts");
  if (!wrap) return;
  const el = document.createElement("div");
  el.className = "toast " + (type === "success" ? "success" : type === "error" ? "error" : "");
  el.innerHTML = `
    <iconify-icon icon="${type === "success" ? "tabler:circle-check" : "tabler:alert-triangle"}" width="18"></iconify-icon>
    <div class="tmsg">${message}</div>
    <button class="tbtn" aria-label="Tutup">
      <iconify-icon icon="tabler:x" width="16"></iconify-icon>
    </button>`;
  wrap.appendChild(el);
  el.querySelector(".tbtn").onclick = () => el.remove();
  setTimeout(() => el.remove(), 4000);
}

export function isoDate(d = new Date()) {
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

// --------------
// Autentikasi & Profil
// --------------
export async function ensureUserDoc(user) {
  // Buat otomatis dokumen users/{uid} jika belum ada
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const email = (user.email || "").toLowerCase();
  const role = ADMIN_EMAILS.has(email)
    ? "admin"
    : KARYAWAN_EMAILS.has(email)
      ? "karyawan"
      : "karyawan";

  const profile = {
    uid: user.uid,
    email,
    name: email.split("@")[0],
    photoURL:
      user.photoURL ||
      `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(email)}`,
    role,
    address: "",
    statusOverride: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(ref, profile, { merge: true });
  return profile;
}

export function redirectByRole(role) {
  if (role === "admin") return window.location.replace("/admin.html");
  if (role === "karyawan") return window.location.replace("/karyawan.html");
  toast({ type: "error", message: "Role tidak dikenali. Hubungi admin." });
}

// Pantau status autentikasi & guard halaman
export function guardPage(pageRole, onReady) {
  // pageRole: "index" | "admin" | "karyawan"
  onAuthStateChanged(auth, async user => {
    if (!user) {
      // Belum login: semua halaman kecuali index → redirect ke index
      if (pageRole !== "index") window.location.replace("/index.html");
      else return onReady(null);
    } else {
      const profile = await ensureUserDoc(user);
      if (pageRole === "index") {
        // Jika sudah login di index
        redirectByRole(profile.role);
      } else if (profile.role !== pageRole) {
        redirectByRole(profile.role);
      } else {
        onReady(profile);
      }
    }
  });
}

// --------------
// PWA & SW
// --------------
export function setupPWA() {
  let deferredPrompt = null;
  const btn = document.getElementById("btnInstall");
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
    if (btn) btn.style.display = "inline-flex";
  });
  if (btn) {
    btn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      btn.style.display = "none";
    });
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  }
}

// --------------
// Cloudinary Upload
// --------------
export async function uploadCloudinary(blob) {
  const form = new FormData();
  form.append("file", blob);
  form.append("upload_preset", CLOUDINARY.uploadPreset);
  const res = await fetch(CLOUDINARY.url, { method: "POST", body: form });
  if (!res.ok) throw new Error("Cloudinary upload failed");
  return res.json();
}

// --------------
// Popover: klik luar untuk tutup
// --------------
export function setupPopoverClose(pairs = []) {
  // pairs: [ { btn: HTMLElement, pop: HTMLElement }, ... ]
  document.addEventListener("click", e => {
    pairs.forEach(({ btn, pop }) => {
      if (!btn.contains(e.target) && !pop.contains(e.target)) {
        pop.classList.remove("show");
      }
    });
  });
}