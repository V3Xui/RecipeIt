import { db } from './firebase.js';
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore";

const RECIPES_COLLECTION = "recipes";

export const createRecipe = async (recipeData, user) => {
    try {
        const docRef = await addDoc(collection(db, RECIPES_COLLECTION), {
            ...recipeData,
            authorId: user.uid,
            authorName: user.displayName,
            authorPhoto: user.photoURL,
            createdAt: serverTimestamp()
        });
        console.log("Recipe created with ID: ", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error adding recipe: ", error);
        throw error;
    }
};

export const getFeedRecipes = async (maxItems = 10) => {
    try {
        const q = query(
            collection(db, RECIPES_COLLECTION), 
            orderBy("createdAt", "desc"), 
            limit(maxItems)
        );
        
        const querySnapshot = await getDocs(q);
        const recipes = [];
        
        querySnapshot.forEach((doc) => {
            recipes.push({ id: doc.id, ...doc.data() });
        });
        
        return recipes;
    } catch (error) {
        console.error("Error fetching feed: ", error);
        return [];
    }
};