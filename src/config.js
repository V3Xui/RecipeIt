const firebaseConfig = {
  apiKey: "AIzaSyCXY0mod0qLck1_SuBN4AzqJfSkPKoo6IQ",
  authDomain: "recipeit-2dee7.firebaseapp.com",
  projectId: "recipeit-2dee7",
  storageBucket: "recipeit-2dee7.firebasestorage.app",
  messagingSenderId: "905679139936",
  appId: "1:905679139936:web:232f2a507bcae6db81bf05",
  measurementId: "G-PHZPRR2N4R"
};

if (!window.firebase.apps.length) {
    window.firebase.initializeApp(firebaseConfig);
}

export const auth = window.firebase.auth();
export const db = window.firebase.firestore();

window.firebase = firebase;