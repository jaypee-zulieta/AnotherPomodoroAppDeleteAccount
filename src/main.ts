// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBGqIfrVWj8zltfY6vd5z6mcV2YOLFkPKk",
  authDomain: "yet-another-pomodoro-app.firebaseapp.com",
  projectId: "yet-another-pomodoro-app",
  storageBucket: "yet-another-pomodoro-app.firebasestorage.app",
  messagingSenderId: "897231797465",
  appId: "1:897231797465:web:0633d0aecdfa592bbed2c8",
  measurementId: "G-P612Q7GXY2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const authSection = document.getElementById("auth-section");
const deleteSection = document.getElementById("delete-section");
const googleSigninBtn = document.getElementById(
  "google-signin-btn"
) as HTMLButtonElement | null;
const emailSigninForm = document.getElementById(
  "email-signin-form"
) as HTMLFormElement | null;
const emailInput = document.getElementById("email") as HTMLInputElement | null;
const passwordInput = document.getElementById(
  "password"
) as HTMLInputElement | null;
const emailSigninBtn = document.getElementById(
  "email-signin-btn"
) as HTMLButtonElement | null;
const signOutBtn = document.getElementById("sign-out-btn");
const signedInInfo = document.getElementById("signed-in-info");
const signedInEmail = document.getElementById("signed-in-email");
const deleteForm = document.getElementById("delete-form") as HTMLFormElement | null;
const confirmInput = document.getElementById(
  "confirm"
) as HTMLInputElement | null;
const deleteBtn = document.querySelector<HTMLButtonElement>(".btn-delete");
const cancelBtn = document.querySelector<HTMLButtonElement>(".btn-cancel");
const statusEl = document.getElementById("status");

let currentUser: User | null = null;
let isSigningIn = false;

function setStatus(message: string, type: "error" | "success" | "") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function setLoading(loading: boolean) {
  isSigningIn = loading;
  if (googleSigninBtn) googleSigninBtn.disabled = loading;
  if (emailSigninBtn) emailSigninBtn.disabled = loading;
}

function friendlyErrorMessage(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/popup-closed-by-user":
      return "The Google sign-in window was closed. Please try again.";
    case "auth/popup-blocked":
      return "The Google sign-in popup was blocked by your browser. Please allow popups and try again.";
    case "auth/account-exists-with-different-credential":
      return "This email is already linked to a different sign-in method. Please try again.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/user-not-found":
      return "No account found with this email address.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password. Please try again.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/requires-recent-login":
      return "Your session has expired. Please sign in again to delete your account.";
    case "auth/user-mismatch":
      return "Authentication error. Please sign in again.";
    case "permission-denied":
      return "You don't have permission to delete your data. Please contact support.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/**
 * Delete all tasks belonging to the given user from Firestore.
 * Uses a batch write for efficiency.
 */
async function deleteUserTasks(userId: string): Promise<void> {
  const tasksQuery = query(
    collection(db, "tasks"),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(tasksQuery);

  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

// Track auth state — when signed in, show delete section; when signed out, show sign-in
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    // Signed in: hide auth section, show delete section
    if (authSection) authSection.classList.add("hidden");
    if (deleteSection) deleteSection.classList.remove("hidden");
    if (signedInInfo) signedInInfo.classList.add("visible");
    if (signedInEmail) signedInEmail.textContent = user.email ?? "";
    setStatus("", "");
    setLoading(false);
  } else {
    // Signed out: show auth section, hide delete section
    if (authSection) authSection.classList.remove("hidden");
    if (deleteSection) deleteSection.classList.add("hidden");
    if (signedInInfo) signedInInfo.classList.remove("visible");
    if (confirmInput) confirmInput.value = "";
    if (deleteBtn) deleteBtn.disabled = true;
    setLoading(false);
  }
});

// Google Sign-In button
if (googleSigninBtn) {
  googleSigninBtn.addEventListener("click", async () => {
    if (isSigningIn) return;
    setLoading(true);
    setStatus("", "");

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle showing the delete section
    } catch (error) {
      setStatus(friendlyErrorMessage(error), "error");
      setLoading(false);
    }
  });
}

// Email/Password Sign-In form
if (emailSigninForm && emailInput && passwordInput) {
  emailSigninForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSigningIn) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      setStatus("Please enter both your email and password.", "error");
      return;
    }

    setLoading(true);
    setStatus("", "");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle showing the delete section
    } catch (error) {
      setStatus(friendlyErrorMessage(error), "error");
      setLoading(false);
    }
  });
}

// Sign out link
if (signOutBtn) {
  signOutBtn.addEventListener("click", async () => {
    await signOut(auth);
  });
}

// Enable the delete button only once the user types DELETE
if (confirmInput && deleteBtn) {
  confirmInput.addEventListener("input", () => {
    deleteBtn.disabled = confirmInput.value.trim() !== "DELETE";
  });
}

if (cancelBtn) {
  cancelBtn.addEventListener("click", () => {
    history.back();
  });
}

// Delete account form submission
if (deleteForm && deleteBtn && confirmInput) {
  deleteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (confirmInput.value.trim() !== "DELETE") return;
    if (!currentUser) {
      setStatus("You must be signed in to delete your account.", "error");
      return;
    }

    deleteBtn.disabled = true;
    setStatus("Deleting your tasks...", "");

    try {
      // 1. Delete all tasks belonging to this user from Firestore
      await deleteUserTasks(currentUser.uid);

      // 2. Delete the auth account
      setStatus("Deleting your account...", "");
      await deleteUser(currentUser);

      setStatus(
        "Your account and all associated data have been permanently deleted. We're sorry to see you go.",
        "success"
      );
    } catch (error) {
      setStatus(friendlyErrorMessage(error), "error");
      deleteBtn.disabled = false;
    }
  });
}
