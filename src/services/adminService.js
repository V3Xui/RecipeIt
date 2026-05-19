import { db, firebase } from '../config.js';

/**
 * Increments the report evaluation counter for a specific recipe post.
 * @param {string} postId 
 * @returns {Promise<void>}
 */
export const reportPost = (postId) => {
    return db.collection("posts").doc(postId).update({
        reportCount: firebase.firestore.FieldValue.increment(1)
    });
};

/**
 * Permanently removes a recipe post from the Firestore database cluster.
 * @param {string} postId 
 * @returns {Promise<void>}
 */
export const purgePost = (postId) => {
    return db.collection("posts").doc(postId).delete();
};

/**
 * Resets the report evaluation count of a flagged post back to clean standing.
 * @param {string} postId 
 * @returns {Promise<void>}
 */
export const clearPostFlags = (postId) => {
    return db.collection("posts").doc(postId).update({
        reportCount: 0
    });
};

/**
 * Permanently suspends account access permissions for a target user ID.
 * @param {string} targetUserId 
 * @returns {Promise<void>}
 */
export const banUserAccount = (targetUserId) => {
    return db.collection("users").doc(targetUserId).set({
        isBanned: true
    }, { merge: true });
};