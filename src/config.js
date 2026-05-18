import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCXY0mod0qLck1_SuBN4AzqJfSkPKoo6IQ",
  authDomain: "recipeit-2dee7.firebaseapp.com",
  projectId: "recipeit-2dee7",
  storageBucket: "recipeit-2dee7.firebasestorage.app",
  messagingSenderId: "905679139936",
  appId: "1:905679139936:web:232f2a507bcae6db81bf05",
  measurementId: "G-PHZPRR2N4R"
};

// Initialize Firebase safely
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();

// Attach globally for your side-effect views to use FieldValue references
window.firebase = firebase;

// Enable Offline Persistence
db.enablePersistence()
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          console.log('Persistence failed: Multiple tabs open');
      } else if (err.code == 'unimplemented') {
          console.log('Persistence not supported by browser');
      }
  });