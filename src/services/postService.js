import { db, firebase } from '../config.js';

/**
 * Adds a clean recipe record configuration into the global posts tracking data collection.
 * @param {object} postPayload 
 * @returns {Promise<firebase.firestore.DocumentReference>}
 */
export const createPost = (postPayload) => {
    return db.collection("posts").add({
        title: postPayload.title,
        category: postPayload.category,
        description: postPayload.description,
        ingredients: postPayload.ingredients,
        instructions: postPayload.instructions,
        tips: postPayload.tips,
        imageUrl: postPayload.imageUrl,
        authorName: postPayload.authorName,
        authorEmail: postPayload.authorEmail,
        authorId: postPayload.authorId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        upvotedBy: [],
        downvotedBy: [],
        reportCount: 0,
        nutrition: postPayload.nutrition,
        dietaryTags: postPayload.dietaryTags
    });
};

/**
 * Updates properties on an existing recipe document.
 * @param {string} postId 
 * @param {object} updateData 
 * @returns {Promise<void>}
 */
export const updatePost = (postId, updateData) => {
    return db.collection("posts").doc(postId).update(updateData);
};

/**
 * Deletes an item from the primary recipe record document layer.
 * @param {string} postId 
 * @returns {Promise<void>}
 */
export const removePost = (postId) => {
    return db.collection("posts").doc(postId).delete();
};

/**
 * Queries a chronological block of recipes using an array-contains look-up rule for lifestyle tags.
 * @param {string} dietTag 
 * @param {number} limitSize 
 * @returns {Promise<firebase.firestore.QuerySnapshot>}
 */
export const queryRecipesByDiet = (dietTag, limitSize = 20) => {
    return db.collection("posts")
        .where("dietaryTags", "array-contains", dietTag)
        .orderBy("createdAt", "desc")
        .limit(limitSize)
        .get();
};

/**
 * Queries a chronological block of recipes using matching category values.
 * @param {string} category 
 * @param {number} limitSize 
 * @returns {Promise<firebase.firestore.QuerySnapshot>}
 */
export const queryRecipesByCategory = (category, limitSize = 20) => {
    return db.collection("posts")
        .where("category", "==", category)
        .orderBy("createdAt", "desc")
        .limit(limitSize)
        .get();
};