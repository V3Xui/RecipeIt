import { auth, db } from './firebase.js';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut,onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

const googleProvider = new GoogleAuthProvider();

// 1. Trigger the redirect (navigates away from your site to Google)
export const loginWithGoogle = () => {
    signInWithRedirect(auth, googleProvider);
};

// 2. Catch the user when Google sends them back to your site
export const checkRedirectLogin = async () => {
    try {
        console.log("Checking for redirect result...");
        const result = await getRedirectResult(auth);
        
        if (result && result.user) {
            console.log("Redirect success! User:", result.user.email);
            const user = result.user;
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                await setDoc(userDocRef, {
                    uid: user.uid,
                    displayName: user.displayName,
                    email: user.email,
                    profilePic: user.photoURL,
                    joinedAt: serverTimestamp(),
                    bio: "New to RecipeIt!"
                });
            }
            return user; // Return the user object if found
        }
    } catch (error) {
        console.error("Redirect Login Error:", error.message);
    }
    return null;
};

// 3. Log out
export const logoutUser = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error:", error.message);
    }
};

// 4. Global state observer
export const listenToAuthChanges = (callback) => {
    onAuthStateChanged(auth, (user) => {
        callback(user);
    });
};