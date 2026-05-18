import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCXY0mod0qLck1_SuBN4AzqJfSkPKoo6IQ",
  authDomain: "recipeit-2dee7.firebaseapp.com",
  projectId: "recipeit-2dee7",
  storageBucket: "recipeit-2dee7.firebasestorage.app",
  messagingSenderId: "905679139936",
  appId: "1:905679139936:web:232f2a507bcae6db81bf05",
  measurementId: "G-PHZPRR2N4R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth and Database instances to be used elsewhere
export const auth = getAuth(app);
export const db = getFirestore(app);
