import { auth, db } from './config.js';

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