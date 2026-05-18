import { db } from './firebase.js';
import { collection, addDoc, getDocs, query, orderBy, limit,serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

const RECIPES_COLLECTION = "recipes";

/**
 * Saves a new recipe to Firestore
 * @param {Object} recipeData - The recipe details (title, ingredients, instructions)
 * @param {Object} user - The currently logged-in user object from Firebase Auth
 */
export const createRecipe = async (recipeData, user) => {
    try {
        const docRef = await addDoc(collection(db, RECIPES_COLLECTION), {
            ...recipeData,
            authorId: user.uid,
            authorName: user.displayName,
            authorPhoto: user.photoURL,
            createdAt: serverTimestamp() // Let Firebase handle the exact time
        });
        console.log("Recipe created with ID: ", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error adding recipe: ", error);
        throw error;
    }
};

/**
 * Fetches the most recent recipes for the feed
 * @param {number} maxItems - Maximum number of recipes to fetch (Defaults to 10 to save quota)
 */
export const getFeedRecipes = async (maxItems = 10) => {
    try {
        // Query: Get newest recipes first, strictly limited
        const q = query(
            collection(db, RECIPES_COLLECTION), 
            orderBy("createdAt", "desc"), 
            limit(maxItems)
        );
        
        const querySnapshot = await getDocs(q);
        const recipes = [];
        
        querySnapshot.forEach((doc) => {
            // Combine the document ID with the actual data
            recipes.push({ id: doc.id, ...doc.data() });
        });
        
        return recipes;
    } catch (error) {
        console.error("Error fetching feed: ", error);
        return [];
    }
};