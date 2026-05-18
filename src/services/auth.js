import { auth, db } from '../config.js';

window.registerUser = () => {
  const name = document.getElementById("reg-username").value;
  const email = document.getElementById("reg-email").value;
  const pass = document.getElementById("reg-pass").value;

  auth.createUserWithEmailAndPassword(email, pass)
    .then((c) => c.user.updateProfile({ displayName: name }).then(() => window.router("/dashboard")))
    .catch((e) => window.showToast(e.message, "error")); // <--- TOAST
};

window.loginUser = () => {
  const email = document.getElementById("login-email").value;
  const pass = document.getElementById("login-pass").value;
  auth.signInWithEmailAndPassword(email, pass).catch((e) => window.showToast(e.message, "error")); // <--- TOAST
};

window.logoutUser = () => auth.signOut();

window.loginWithGoogle = () => {
    const provider = new window.firebase.auth.GoogleAuthProvider();
    
    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            
            // Check if this is a brand new user
            db.collection("users").doc(user.uid).get().then((doc) => {
                if (!doc.exists) {
                    db.collection("users").doc(user.uid).set({
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        bio: "New to Recipeit!",
                        savedRecipes: [],
                        following: []
                    });
                }
            });
            
            window.showToast("Welcome!", "success");
            window.router("/dashboard");
        })
        .catch((e) => {
            if (e.code !== 'auth/popup-closed-by-user') {
                window.showToast(e.message, "error");
            }
        });
};