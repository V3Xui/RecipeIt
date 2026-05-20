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
            
            db.collection("users").doc(user.uid).get().then((doc) => {
                if (!doc.exists) {
                    db.collection("users").doc(user.uid).set({
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        bio: "New to Recipeit!",
                        savedRecipes: [],
                        following: [],
                        blockedUsers: [], // ➕ Ensures structural alignment
                        blockedBy: []     // ➕ Ensures structural alignment
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

/**
 * Executes a complete account deletion sequence, removing the profile document,
 * cleaning or anonymizing tracking metadata, and purging the Firebase Auth user record.
 * @returns {Promise<void>}
 */
export const purgeUserAccountPermanently = async () => {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error("No active authenticated user session discovered.");

    const uid = user.uid;
    const batch = db.batch();

    // 1. Target the primary profile tracking entry document
    const userRef = db.collection("users").doc(uid);
    batch.delete(userRef);

    // Commit the Firestore storage tier structural cleanup
    await batch.commit();

    // 2. Anonymize user published posts so the community timeline doesn't break
    const postsSnap = await db.collection("posts").where("authorId", "==", uid).get();
    if (!postsSnap.empty) {
        const postBatch = db.batch();
        postsSnap.forEach(doc => {
            postBatch.update(doc.ref, {
                authorName: "Anonymized Chef",
                authorId: "deleted_user"
            });
        });
        await postBatch.commit();
    }

    // 3. Sever the core credential authentication reference layer
    await user.delete();
};