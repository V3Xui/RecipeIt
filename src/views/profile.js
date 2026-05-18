import { auth, db } from '../config.js';
import { createPostCard } from '../components/postCard.js';

const DEFAULT_AVATAR = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

export const loadAccountSettings = () => {
  const user = auth.currentUser;
  if (!user) return window.router("/");
  
  setTimeout(() => {
    const nameInput = document.getElementById("edit-name");
    if (nameInput) nameInput.value = user.displayName || "";
    
    db.collection("users").doc(user.uid).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const bio = document.getElementById("edit-bio");
            if(bio) bio.value = data.bio || "";
            if(data.displayName && nameInput) nameInput.value = data.displayName;
            const img = document.getElementById("edit-avatar-preview");
            if(img) img.src = data.photoURL || DEFAULT_AVATAR;
        }
    });
  }, 100);
};

window.previewAvatar = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => document.getElementById('edit-avatar-preview').src = e.target.result;
        reader.readAsDataURL(input.files[0]);
    }
};

window.saveProfile = () => {
  const user = auth.currentUser;
  const newName = document.getElementById("edit-name").value;
  const newBio = document.getElementById("edit-bio").value;
  const newPass = document.getElementById("edit-pass").value;
  const file = document.getElementById("edit-avatar").files[0];
  const promises = [];

  if (newName && newName !== user.displayName) promises.push(user.updateProfile({ displayName: newName }));
  if (newPass) promises.push(user.updatePassword(newPass));

  const saveToFirestore = (photoURL) => {
      const updateData = { bio: newBio, email: user.email, displayName: newName };
      if (photoURL) updateData.photoURL = photoURL;
      promises.push(db.collection("users").doc(user.uid).set(updateData, { merge: true }));
      Promise.all(promises).then(() => { 
          window.showToast("Profile updated successfully!", "success"); 
          window.router("/dashboard"); 
      }).catch((e) => window.showToast(e.message, "error"));
  };

  if (file) {
      const reader = new FileReader();
      reader.onloadend = () => saveToFirestore(reader.result);
      reader.readAsDataURL(file);
  } else { saveToFirestore(null); }
};

export const loadPublicProfile = (targetUserId) => {
    const currentUser = auth.currentUser;
    const nameEl = document.getElementById("profile-name");
    const bioEl = document.getElementById("profile-bio");
    const avatarEl = document.getElementById("profile-avatar");
    const actionArea = document.getElementById("follow-action-area");
    const feed = document.getElementById("user-posts-feed");
    const postCountEl = document.getElementById("profile-post-count");
    const followerCountEl = document.getElementById("profile-follower-count");

    db.collection("users").doc(targetUserId).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data(); 
            nameEl.innerText = data.displayName || data.email || "Unknown Chef";
            bioEl.innerText = data.bio || "No bio yet.";
            if (avatarEl) avatarEl.src = data.photoURL || DEFAULT_AVATAR;
            
            if (currentUser && currentUser.uid !== targetUserId) {
                db.collection("users").doc(currentUser.uid).onSnapshot((myDoc) => {
                    // FIX: Provide a fallback layout if the current user profile data is uninitialized
                    const myData = myDoc.data() || { following: [] };
                    const amFollowing = myData.following && myData.following.includes(targetUserId);
                    const safeName = (data.displayName || 'Chef').replace(/'/g, "\\'");
                    const msgBtn = `<button onclick="window.startChat('${targetUserId}', '${safeName}')" style="background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color); margin-left: 10px;">Message</button>`;

                    if (amFollowing) {
                        actionArea.innerHTML = `<button onclick="window.toggleFollow('${targetUserId}', false)" style="background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color);">Unfollow</button> ${msgBtn}`;
                    } else {
                        actionArea.innerHTML = `<button onclick="window.toggleFollow('${targetUserId}', true)" style="background: var(--accent-color); color: white;">Follow Chef</button> ${msgBtn}`;
                    }
                });
            } else if (currentUser && currentUser.uid === targetUserId) {
                actionArea.innerHTML = `<button onclick="window.router('/account')" style="font-size:0.9rem;">Edit Profile</button>`;
            }
        } else {
            nameEl.innerText = "User not found";
        }
    });

    db.collection("posts").where("authorId", "==", targetUserId).orderBy("createdAt", "desc").onSnapshot((snap) => {
        feed.innerHTML = "";
        if(postCountEl) postCountEl.innerText = snap.size; 
        if (snap.empty) { feed.innerHTML = "<p>No recipes posted yet.</p>"; return; }
        snap.forEach((doc) => {
            feed.innerHTML += createPostCard(doc.data(), doc.id, currentUser);
        });
    });

    db.collection("users").where("following", "array-contains", targetUserId).onSnapshot((snap) => {
        if(followerCountEl) followerCountEl.innerText = snap.size;
    });
};

export const loadSavedPosts = () => {
  const user = auth.currentUser;
  if (!user) return window.router("/");
  const feed = document.getElementById("saved-posts-feed");
  if (!feed) return;
  if (!window.myBookmarks || window.myBookmarks.length === 0) { feed.innerHTML = "<p>No saved recipes yet.</p>"; return; }
  db.collection("posts").orderBy("createdAt", "desc").get().then((snap) => {
      feed.innerHTML = "";
      snap.forEach((doc) => {
          if (window.myBookmarks.includes(doc.id)) feed.innerHTML += createPostCard(doc.data(), doc.id, user);
      });
  });
};

export const loadShoppingList = () => {
    const user = auth.currentUser;
    if (!user) return window.router("/");
    const listContainer = document.getElementById("shopping-list-items");
    if (!listContainer) return;

    db.collection("users").doc(user.uid).onSnapshot((doc) => {
        if (!doc.exists) return;
        const items = doc.data().shoppingList || [];
        if (items.length === 0) { listContainer.innerHTML = "<p style='text-align:center; color: var(--text-sec); padding: 20px;'>Your list is empty.</p>"; return; }
        listContainer.innerHTML = "";
        items.forEach((item) => {
            const safeItem = item.replace(/"/g, "&quot;").replace(/'/g, "\\'");
            listContainer.innerHTML += `
            <div style="display:flex; align-items:center; padding: 12px; border-bottom: 1px solid var(--border-color); background: var(--card-bg);">
                <input type="checkbox" class="shopping-checkbox" value="${safeItem}" onchange="window.updateSelectedCount()" style="margin-right: 15px; width: 18px; height: 18px; display: none; cursor: pointer;">
                <span style="font-size: 1rem; flex: 1;">${item}</span>
                <button class="single-delete-btn" onclick="window.removeShoppingItem('${safeItem}')" style="background:transparent; color: #ff4500; padding: 5px;"><i class='bx bx-trash' style="font-size: 1.2rem;"></i></button>
            </div>`;
        });
        const bulkRow = document.getElementById("bulk-action-row");
        if(bulkRow && bulkRow.style.display !== "none") window.applySelectModeStyles(true);
    });
};

window.toggleSelectionMode = () => {
    const addRow = document.getElementById("add-item-row");
    const bulkRow = document.getElementById("bulk-action-row");
    if (addRow.style.display !== "none") {
        addRow.style.display = "none";
        bulkRow.style.display = "flex";
        window.applySelectModeStyles(true);
    } else {
        addRow.style.display = "flex";
        bulkRow.style.display = "none";
        window.applySelectModeStyles(false);
        document.querySelectorAll('.shopping-checkbox').forEach(cb => cb.checked = false);
        window.updateSelectedCount();
    }
};

window.applySelectModeStyles = (isSelectMode) => {
    const checkboxes = document.querySelectorAll('.shopping-checkbox');
    const deleteBtns = document.querySelectorAll('.single-delete-btn');
    checkboxes.forEach(cb => cb.style.display = isSelectMode ? "block" : "none");
    deleteBtns.forEach(btn => btn.style.display = isSelectMode ? "none" : "block");
};

window.updateSelectedCount = () => {
    const count = document.querySelectorAll('.shopping-checkbox:checked').length;
    const span = document.getElementById("selected-count");
    if(span) span.innerText = `${count} selected`;
};

window.toggleSelectAll = () => {
    const checkboxes = document.querySelectorAll('.shopping-checkbox');
    if (checkboxes.length === 0) return;
    const allSelected = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => { cb.checked = !allSelected; });
    window.updateSelectedCount();
};

window.deleteSelectedItems = () => {
    const user = auth.currentUser;
    if (!user) return;
    const checkboxes = document.querySelectorAll('.shopping-checkbox:checked');
    if (checkboxes.length === 0) return window.showToast("No items selected", "error");
    if (confirm(`Delete ${checkboxes.length} items?`)) {
        const itemsToDelete = Array.from(checkboxes).map(cb => cb.value);
        db.collection("users").doc(user.uid).update({ shoppingList: firebase.firestore.FieldValue.arrayRemove(...itemsToDelete) }).then(() => window.toggleSelectionMode());
    }
};

window.addManualItem = () => {
    const input = document.getElementById("manual-item-input");
    const val = input.value.trim();
    if (val && auth.currentUser) db.collection("users").doc(auth.currentUser.uid).update({ shoppingList: firebase.firestore.FieldValue.arrayUnion(val) }).then(() => input.value = "");
};

window.removeShoppingItem = (itemText) => {
    if (auth.currentUser && confirm("Remove this item?")) db.collection("users").doc(auth.currentUser.uid).update({ shoppingList: firebase.firestore.FieldValue.arrayRemove(itemText) });
};

window.toggleFollow = async (targetUserId, targetUserName) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        window.showToast("Please log in to follow chefs!", "error");
        return;
    }

    const myDocRef = db.collection("users").doc(currentUser.uid);
    const theirDocRef = db.collection("users").doc(targetUserId);

    try {
        const myDoc = await myDocRef.get();
        // Fallback array handling if document is uninitialized
        const myData = myDoc.data() || { following: [] };
        const isFollowing = myData.following && myData.following.includes(targetUserId);

        if (isFollowing) {
            // Unfollow logic: Switch .update() to .set(..., { merge: true })
            await myDocRef.set({
                following: firebase.firestore.FieldValue.arrayRemove(targetUserId)
            }, { merge: true });

            await theirDocRef.set({
                followers: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
            }, { merge: true });

            window.showToast(`Unfollowed ${targetUserName}`);
        } else {
            // Follow logic: Switch .update() to .set(..., { merge: true })
            await myDocRef.set({
                following: firebase.firestore.FieldValue.arrayUnion(targetUserId)
            }, { merge: true });

            await theirDocRef.set({
                followers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
            }, { merge: true });

            window.showToast(`Following ${targetUserName}!`, "success");
        }
    } catch (error) {
        console.error("Follow Toggle Error:", error);
        window.showToast("Could not complete follow action.", "error");
    }
};

export const loadMenu = () => {
    const user = auth.currentUser;
    if (!user) return window.router("/");
    
    setTimeout(() => {
        const img = document.getElementById("menu-avatar");
        const name = document.getElementById("menu-name");
        const themeIcon = document.getElementById("menu-theme-icon");
        const optionsList = document.getElementById("menu-options-list");
        
        if (img) img.src = user.photoURL || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";
        if (name) name.innerText = user.displayName || user.email;
        
        // FIX: Real-time authorization check injection block
        if (optionsList && window.currentUserData && window.currentUserData.role === 'admin') {
            // Guard statement to prevent duplicate button renders on back-and-forth navigations
            if (!document.getElementById("admin-menu-item")) {
                const adminItem = document.createElement("div");
                adminItem.id = "admin-menu-item";
                adminItem.className = "menu-item-styled";
                adminItem.style.borderBottom = "1px solid var(--border-color)";
                adminItem.style.background = "#ff450010";
                adminItem.style.fontWeight = "bold";
                adminItem.onclick = () => window.router('/admin');
                adminItem.innerHTML = `<i class='bx bx-shield-quarter' style='font-size:1.2rem; color:var(--accent-color);'></i> Moderation Control`;
                
                // Prepend pushes it directly to the top of the option rows list container
                optionsList.prepend(adminItem);
            }
        }
        
        const currentTheme = localStorage.getItem('theme') || 'light';
        if(themeIcon) themeIcon.className = currentTheme === 'dark' ? 'bx bx-sun' : 'bx bx-moon';
    }, 50);
};

window.loadSavedPosts = loadSavedPosts;
window.loadShoppingList = loadShoppingList;
window.loadPublicProfile = loadPublicProfile;
window.loadMenu = loadMenu;