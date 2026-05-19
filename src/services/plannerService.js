import { db, firebase } from '../config.js';

/**
 * Writes a calculated snapshot meal mapping to a user's internal tracking sub-collection.
 * @param {string} userId - Active user's unique identifier
 * @param {object} mealData - Compound payload containing recipe metadata and parsed numeric macros
 * @returns {Promise<firebase.firestore.DocumentReference>}
 */
export const addMealToCalendar = (userId, mealData) => {
    return db.collection("users").doc(userId).collection("mealPlan").add({
        postId: mealData.postId,
        recipeTitle: mealData.recipeTitle,
        dayOfWeek: mealData.dayOfWeek,
        calories: parseInt(mealData.calories) || 0,
        protein: parseInt(mealData.protein) || 0,
        carbs: parseInt(mealData.carbs) || 0,
        fat: parseInt(mealData.fat) || 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
};

/**
 * Destroys a mapped calendar meal record from a user's chronological tracking file history.
 * @param {string} userId 
 * @param {string} planId 
 * @returns {Promise<void>}
 */
export const deleteMealFromCalendar = (userId, planId) => {
    return db.collection("users").doc(userId).collection("mealPlan").doc(planId).delete();
};

/**
 * Fetches all scheduled meal mapping data fields logged under an account profile.
 * @param {string} userId 
 * @returns {Promise<firebase.firestore.QuerySnapshot>}
 */
export const fetchUserMealPlan = (userId) => {
    return db.collection("users").doc(userId).collection("mealPlan").get();
};