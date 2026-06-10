import { db, firebase } from '../config.js';

/**
 * Increments the report evaluation counter for a specific recipe post.
 * Phase 2: Appends the reporting user's unique identifier token to track accountability.
 * @param {string} postId 
 * @returns {Promise<void>}
 */
export const reportPost = (postId) => {
    const currentUid = firebase.auth().currentUser?.uid;
    if (!currentUid) return Promise.reject(new Error("Unauthenticated report submission attempted."));

    return db.collection("posts").doc(postId).update({
        reportCount: firebase.firestore.FieldValue.increment(1),
        reportedByUsers: firebase.firestore.FieldValue.arrayUnion(currentUid)
    });
};

/**
 * Permanently removes a recipe post from the Firestore database cluster.
 */
export const purgePost = (postId) => {
    return db.collection("posts").doc(postId).delete();
};

/**
 * Resets the report evaluation count of a flagged post back to clean standing.
 * Phase 2: Atomic transaction loops to extract false reporters and penalize profile entries.
 * @param {string} postId 
 * @returns {Promise<void>}
 */
export const clearPostFlags = (postId) => {
    const postRef = db.collection("posts").doc(postId);

    return db.runTransaction(async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists) throw new Error("Target recipe record disappeared.");

        const postData = postDoc.data();
        const falseReporters = postData.reportedByUsers || [];

        // Distribute false reporting strikes across target cooking profiles
        falseReporters.forEach((uid) => {
            const userRef = db.collection("users").doc(uid);
            transaction.set(userRef, {
                falseReportCount: firebase.firestore.FieldValue.increment(1)
            }, { merge: true });
        });

        // Flush tracking parameters back to baseline clean status values
        transaction.update(postRef, {
            reportCount: 0,
            reportedByUsers: []
        });
    });
};

/**
 * Permanently suspends account access permissions for a target user ID.
 */
export const banUserAccount = (targetUserId) => {
    return db.collection("users").doc(targetUserId).set({
        isBanned: true
    }, { merge: true });
};