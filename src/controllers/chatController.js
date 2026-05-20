import { auth, db } from '../config.js';
import { createChatRoom, sendMessage, updateChatStatus, toggleArchiveState, addBlockRule } from '../services/chatService.js';

/**
 * Renders an inline creation overlay modal to build multi-user group channels.
 */
window.openCreateGroupModal = () => {
    const currentUid = auth.currentUser.uid;
    let modal = document.getElementById('group-creation-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'group-creation-modal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    // Fetch the chefs you follow from your profile data layer
    db.collection("users").doc(currentUid).get().then((doc) => {
        const following = (doc.exists && doc.data().following) ? doc.data().following : [];
        
        if (following.length === 0) {
            window.showToast("Follow other cooks first to invite them to groups!", "error");
            return;
        }

        // Build checklist nodes
        const promises = following.map(uid => db.collection("users").doc(uid).get());
        Promise.all(promises).then(userDocs => {
            const listHTML = userDocs.map(d => {
                if (!d.exists) return "";
                const u = d.data();
                return `
                    <label style="display:flex; align-items:center; gap:10px; background:var(--bg-color); padding:10px; border-radius:8px; margin-bottom:6px; cursor:pointer;">
                        <input type="checkbox" name="group-members" value="${d.id}" style="width:18px; height:18px; accent-color:var(--accent-color);">
                        <span>${u.displayName || u.email}</span>
                    </label>
                `;
            }).join("");

            modal.innerHTML = `
                <div class="modal-card" style="max-width:360px;">
                    <h3 style="margin-bottom:5px;"><i class='bx bx-group' style='color:var(--accent-color);'></i> Form Cooking Circle</h3>
                    <input type="text" id="new-group-name" placeholder="Group Name (e.g., Keto Crew 🥑)" class="create-input" style="margin-bottom:12px;">
                    <span style="font-size:0.75rem; font-weight:bold; color:var(--text-sec); display:block; margin-bottom:6px;">Select Members:</span>
                    <div style="max-height:180px; overflow-y:auto; margin-bottom:15px;">
                        ${listHTML}
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button onclick="document.getElementById('group-creation-modal').style.display='none'" style="flex:1; background:transparent; border:1px solid var(--border-color); color:var(--text-sec);">Cancel</button>
                        <button onclick="window.submitGroupChannel()" style="flex:1;">Create</button>
                    </div>
                </div>
            `;
            modal.style.display = 'flex';
        });
    });
};

/**
 * Validates form parameters and creates the group document channel.
 */
window.submitGroupChannel = async () => {
    const name = document.getElementById("new-group-name").value.trim();
    const checkedBoxes = document.querySelectorAll('input[name="group-members"]:checked');
    if (!name) return window.showToast("Group name required!", "error");
    if (checkedBoxes.length === 0) return window.showToast("Select at least 1 member!", "error");

    // 🛡️ ARCHITECTURAL BOUNDARY: Enforce a strict 5-member household utility cap
    if (checkedBoxes.length > 4) {
        window.showToast("Cooking circles are optimized for household utility and capped at 5 members max.", "error");
        return;
    }

    const memberIds = Array.from(checkedBoxes).map(cb => cb.value);
    memberIds.push(auth.currentUser.uid); // Ensure creator is included

    try {
        const docRef = await createChatRoom("group", memberIds, name);
        document.getElementById('group-creation-modal').style.display = 'none';
        window.showToast(`Group "${name}" established!`, "success");
        window.router(`/messages/${docRef.id}`);
    } catch (err) {
        window.showToast("Failed to create group: " + err.message, "error");
    }
};

/**
 * Runs a client-side search across active inbox text nodes.
 */
window.handleSearchInbox = () => {
    const query = (document.getElementById("inbox-search-bar")?.value || "").toLowerCase();
    document.querySelectorAll(".inbox-card-item").forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(query) ? "flex" : "none";
    });
};

/**
 * Accepts an incoming message request.
 */
window.acceptMessageRequest = async (chatId) => {
    try {
        await updateChatStatus(chatId, auth.currentUser.uid, "accepted");
        window.showToast("Conversation request approved!", "success");
        window.router(`/messages/${chatId}`);
    } catch (err) {
        window.showToast("Action error: " + err.message, "error");
    }
};

/**
 * Archives a message channel.
 */
window.archiveChatChannel = async (chatId) => {
    try {
        await toggleArchiveState(chatId, auth.currentUser.uid, true);
        window.showToast("Channel moved to archive storage files.", "normal");
    } catch (err) {
        console.error(err);
    }
};

/**
 * Submits a standard blocking parameter.
 */
window.blockChatParticipant = async (targetUid, userName) => {
    const confirm = await window.customConfirm(`Are you sure you want to block ${userName}? You will no longer receive communications from them.`);
    if (confirm) {
        try {
            await addBlockRule(auth.currentUser.uid, targetUid);
            window.showToast(`${userName} successfully blocked.`, "success");
            window.router("/messages");
        } catch (err) {
            window.showToast("Error updating rules: " + err.message, "error");
        }
    }
};