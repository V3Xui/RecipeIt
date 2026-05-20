import { auth, db } from '../config.js';
import { sendMessage } from '../services/chatService.js';
import { addMembersToGroup, removeMemberFromGroup } from '../services/chatService.js';

window.activeInboxTab = 'active';
window.activeChatListenerUnsubscribe = null;

/**
 * Toggles view tabs within the core Inbox window workspace layouts.
 */
window.switchInboxTab = (tab) => {
    window.activeInboxTab = tab;
    const tabs = ['active', 'requests', 'archived'];
    
    tabs.forEach(t => {
        const btn = document.getElementById(`msg-tab-${t}`);
        if (!btn) return;
        const isActive = t === tab;
        btn.style.backgroundColor = isActive ? "var(--accent-color)" : "var(--card-bg)";
        btn.style.color = isActive ? "white" : "var(--text-main)";
        btn.style.borderColor = isActive ? "var(--accent-color)" : "var(--border-color)";
    });

    window.loadInbox();
};

/**
 * Initializes real-time listener snapshots to monitor messaging channels arrays.
 */
window.loadInbox = () => {
    const user = auth.currentUser;
    if (!user) return;

    const listContainer = document.getElementById("inbox-list");
    if (!listContainer) return;

    db.collection("chats")
      .where("participants", "array-contains", user.uid)
      .onSnapshot(async (snap) => {
          listContainer.innerHTML = "";
          
          if (snap.empty) {
              listContainer.innerHTML = `<p style="text-align:center; padding:30px; color:var(--text-sec); font-size:0.85rem; font-style:italic;">No threads inside this section.</p>`;
              return;
          }

          let counter = 0;

          for (const doc of snap.docs) {
              const chat = doc.data();
              const chatId = doc.id;

              const status = chat.status?.[user.uid] || "accepted";
              const isArchived = chat.archivedBy?.[user.uid] || false;
              const textSnippet = chat.lastMessage?.text || "No messages yet...";

              // Filter logic for active tabs
              if (window.activeInboxTab === 'active' && (status !== 'accepted' || isArchived)) continue;
              if (window.activeInboxTab === 'requests' && status !== 'pending') continue;
              if (window.activeInboxTab === 'archived' && !isArchived) continue;

              counter++;

              let chatTitle = chat.groupName || "Direct Message";
              let iconClass = chat.type === "group" ? "bx-group" : "bx-user";
              let colorAccent = chat.type === "group" ? "var(--accent-color)" : "var(--text-sec)";

              // Direct Message details lookup to find who messaged you
              if (chat.type !== "group") {
                  const otherParticipant = chat.participants.find(id => id !== user.uid);
                  if (otherParticipant) {
                      try {
                          const userDoc = await db.collection("users").doc(otherParticipant).get();
                          if (userDoc.exists) {
                              chatTitle = userDoc.data().displayName || userDoc.data().email || "Unknown Cook";
                          }
                      } catch (err) {
                          console.error("Participant name lookup failure:", err);
                      }
                  }
              }

              let actionButtonsHTML = "";
              if (window.activeInboxTab === 'requests') {
                  actionButtonsHTML = `<button onclick="window.acceptMessageRequest('${chatId}')" style="background:var(--accent-color); color:white; border:none; padding:6px 12px; border-radius:12px; font-size:0.75rem; font-weight:bold; cursor:pointer;">Accept</button>`;
              } else if (window.activeInboxTab === 'active') {
                  actionButtonsHTML = `<button onclick="window.archiveChatChannel('${chatId}')" style="background:transparent; border:1px solid var(--border-color); color:var(--text-sec); padding:4px 8px; border-radius:12px; font-size:0.7rem; cursor:pointer;"><i class='bx bx-archive-in'></i> Archive</button>`;
              }

              const cardHTML = `
                <div class="inbox-card-item" onclick="window.router('/messages/${chatId}')" style="display:flex; align-items:center; justify-content:space-between; padding:12px 15px; background:var(--card-bg); border:1px solid var(--border-color); border-radius:10px; cursor:pointer; transition:transform 0.15s; margin-bottom:8px;">
                    <div style="display:flex; align-items:center; gap:12px; flex:1; overflow:hidden;">
                        <div style="width:40px; height:40px; border-radius:50%; background:var(--bg-color); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center;">
                            <i class='bx ${iconClass}' style="font-size:1.2rem; color:${colorAccent};"></i>
                        </div>
                        <div style="flex:1; overflow:hidden;">
                            <h4 style="margin:0; font-size:0.95rem; color:var(--text-main);">${chatTitle}</h4>
                            <p style="margin:2px 0 0 0; font-size:0.75rem; color:var(--text-sec); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${textSnippet}</p>
                        </div>
                    </div>
                    <div onclick="event.stopPropagation()" style="margin-left:10px;">
                        ${actionButtonsHTML}
                    </div>
                </div>
              `;
              listContainer.insertAdjacentHTML('beforeend', cardHTML);
          }

          if (counter === 0) {
              listContainer.innerHTML = `<p style="text-align:center; padding:30px; color:var(--text-sec); font-size:0.85rem; font-style:italic;">No threads inside this section.</p>`;
          }
      });
};

/**
 * Runs inside sub-collections to stream conversational message bubble elements.
 */
window.loadChatRoom = (chatId) => {
    const user = auth.currentUser;
    if (!user) return;

    const msgContainer = document.getElementById("chat-messages");
    const headerName = document.getElementById("chat-header-name");
    if (!msgContainer) return;

    window.activeChatId = chatId;

    // 🛡️ COST CONTROL: Unsubscribe from the previous chat stream if it exists before spawning a new one
    if (typeof window.activeChatListenerUnsubscribe === 'function') {
        window.activeChatListenerUnsubscribe();
        window.activeChatListenerUnsubscribe = null;
    }

    db.collection("chats").doc(chatId).get().then(async (doc) => {
        if (doc.exists) {
            const chat = doc.data();
            if (chat.groupName) {
                headerName.innerText = chat.groupName;
            } else {
                const otherParticipant = chat.participants.find(id => id !== user.uid);
                if (otherParticipant) {
                    const uDoc = await db.collection("users").doc(otherParticipant).get();
                    headerName.innerText = uDoc.exists ? (uDoc.data().displayName || uDoc.data().email) : "Direct Message Thread";
                }
            }
        }
    });

    window.activeChatListenerUnsubscribe = db.collection("chats").doc(chatId).collection("messages")
      .orderBy("createdAt", "asc")
      .onSnapshot((snap) => {
          msgContainer.innerHTML = "";
          snap.forEach((d) => {
              const m = d.data();
              const isMe = m.senderId === user.uid;
              
              const alignment = isMe ? "align-self: flex-end; background: var(--accent-color); color: white; border-radius: 12px 12px 0 12px;" : "align-self: flex-start; background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 12px 12px 12px 0;";
              const senderLabel = (!isMe && m.senderName) ? `<small style="display:block; font-size:0.65rem; color:var(--text-sec); margin-bottom:2px; font-weight:bold;">${m.senderName}</small>` : "";

              msgContainer.innerHTML += `
                <div style="max-width: 75%; margin-bottom: 8px; padding: 8px 12px; font-size: 0.9rem; line-height: 1.3; ${alignment}">
                    ${senderLabel}
                    <div>${m.text}</div>
                </div>
              `;
          });
          msgContainer.scrollTop = msgContainer.scrollHeight; 
      });
};

/**
 * Submits text entries into the conversation room.
 */
window.sendChatMessage = async () => {
    const input = document.getElementById("chat-input");
    const text = input ? input.value.trim() : "";
    if (!text || !window.activeChatId) return;

    try {
        const name = auth.currentUser.displayName || auth.currentUser.email;
        await sendMessage(window.activeChatId, text, name);
        if (input) input.value = "";
    } catch (err) {
        console.error("Message submission crash:", err);
    }
};

window.startChat = (targetUserId, targetName) => {
    const currentUid = auth.currentUser.uid;
    
    db.collection("chats")
      .where("type", "==", "direct")
      .where("participants", "array-contains", currentUid)
      .get()
      .then(async (snap) => {
          let existingChatId = null;
          snap.forEach(doc => {
              if (doc.data().participants.includes(targetUserId)) existingChatId = doc.id;
          });

          if (existingChatId) {
              window.router(`/messages/${existingChatId}`);
          } else {
              const docRef = await db.collection("chats").add({
                  type: "direct",
                  participants: [currentUid, targetUserId],
                  status: { [currentUid]: "accepted", [targetUserId]: "pending" },
                  archivedBy: { [currentUid]: false, [targetUserId]: false },
                  lastMessage: { text: "Chat request submitted", senderId: currentUid, timestamp: window.firebase.firestore.FieldValue.serverTimestamp() },
                  createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
              });
              window.showToast("Message request sent!", "success");
              window.router(`/messages/${docRef.id}`);
          }
      });
};

window.toggleChatInfoMenu = (event) => {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById("chat-info-dropdown");
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    }
};

// Global click event to close the info dropdown if the user clicks anywhere else
window.addEventListener("click", () => {
    const dropdown = document.getElementById("chat-info-dropdown");
    if (dropdown) dropdown.style.display = "none";
});

// Cache variables to track active conversation targets
window.currentChatParticipantId = null;
window.currentChatParticipantName = "";

/**
 * Enhancing your existing loadChatRoom function hook to assign dynamic info parameters.
 */
const originalLoadChatRoom = window.loadChatRoom;
window.loadChatRoom = (chatId) => {
    // Invoke your original setup script logic safely
    if (originalLoadChatRoom) originalLoadChatRoom(chatId);

    const user = auth.currentUser;
    if (!user) return;

    // Fetch channel metadata to wire up our new options panel links
    db.collection("chats").doc(chatId).get().then(async (doc) => {
        if (!doc.exists) return;
        const chat = doc.data();

        // If it's a 1-on-1 direct message, isolate the other user's ID
        if (chat.type !== "group") {
            const otherUserUid = chat.participants.find(uid => uid !== user.uid);
            if (otherUserUid) {
                const uDoc = await db.collection("users").doc(otherUserUid).get();
                if (uDoc.exists) {
                    window.currentChatParticipantId = otherUserUid;
                    window.currentChatParticipantName = uDoc.data().displayName || uDoc.data().email || "Chef";
                    
                    // Wire up the new menu buttons dynamically
                    setupInfoMenuActions(chatId, window.currentChatParticipantId, window.currentChatParticipantName);
                }
            }
        } else {
            // Group Chat contexts handling adjustments
            window.currentChatParticipantId = null;
            window.currentChatParticipantName = chat.groupName;
            setupInfoMenuActions(chatId, null, chat.groupName, true);
        }
    });
};

/**
 * Assigns programmatic actions to our top-right info menu nodes.
 */
const setupInfoMenuActions = (chatId, targetUid, targetName, isGroup = false) => {
    const profileBtn = document.getElementById("info-menu-profile");
    const membersBtn = document.getElementById("info-menu-members");
    const muteBtn = document.getElementById("info-menu-mute");
    const clearBtn = document.getElementById("info-menu-clear");
    const blockBtn = document.getElementById("info-menu-block");

    if (isGroup) {
        if (profileBtn) profileBtn.style.display = "none";
        if (blockBtn) blockBtn.style.display = "none";
        
        // Expose the view members element option for group configurations
        if (membersBtn) {
            membersBtn.style.display = "flex";
            membersBtn.onclick = () => window.openGroupMembersManagement(chatId);
        }
    } else {
        if (membersBtn) membersBtn.style.display = "none";
        if (profileBtn) {
            profileBtn.style.display = "flex";
            profileBtn.onclick = () => window.router(`/user/${targetUid}`);
        }
        if (blockBtn) {
            blockBtn.style.display = "flex";
            blockBtn.onclick = () => {
                if (window.blockChatParticipant) window.blockChatParticipant(targetUid, targetName);
            };
        }
    }

    if (muteBtn) {
        muteBtn.onclick = () => {
            window.showToast(`Notifications from ${targetName} muted.`, "normal");
        };
    }

    if (clearBtn) {
        clearBtn.onclick = async () => {
            const confirmClear = await window.customConfirm("Are you sure you want to clear your message display? This action cannot be undone.");
            if (confirmClear) {
                const msgContainer = document.getElementById("chat-messages");
                if (msgContainer) msgContainer.innerHTML = "";
                window.showToast("Conversation display cleared locally.", "normal");
            }
        };
    }
};

/**
 * Fetches, filters, and renders the roster sub-modal panels layout properties.
 */
window.openGroupMembersManagement = async (chatId) => {
    const currentUid = auth.currentUser.uid;
    const modal = document.getElementById("group-members-modal");
    const rosterContainer = document.getElementById("modal-members-list");
    const candidateContainer = document.getElementById("modal-add-candidates-list");
    const addBtn = document.getElementById("modal-btn-add-submit");

    if (!modal || !rosterContainer || !candidateContainer) return;

    rosterContainer.innerHTML = `<div style="text-align:center; padding:10px;"><i class='bx bx-loader-alt bx-spin'></i></div>`;
    candidateContainer.innerHTML = "";
    if (addBtn) addBtn.style.display = "none";
    modal.style.display = "flex";

    try {
        // 1. Read current active group structure parameters
        const chatDoc = await db.collection("chats").doc(chatId).get();
        if (!chatDoc.exists) return;
        const chatData = chatDoc.data();
        const activeParticipants = chatData.participants || [];

        // 2. Fetch profile card metadata for every current member
        rosterContainer.innerHTML = "";
        const profilePromises = activeParticipants.map(uid => db.collection("users").doc(uid).get());
        const profileDocs = await Promise.all(profilePromises);

        profileDocs.forEach(pDoc => {
            if (!pDoc.exists) return;
            const u = pDoc.data();
            const isMe = pDoc.id === currentUid;
            
            // Check if you are looking at the creator/admin profile card link
            const isCreator = chatData.lastMessage?.senderId === pDoc.id || false; 

            // Only reveal member removal controls if the current user is an admin or if it's their own profilecard
            const showRemoveAction = !isMe && !isCreator;

            const memberRow = `
                <div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-color); padding:8px 12px; border-radius:8px; border:1px solid var(--border-color);">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class='bx bx-user' style="color:var(--accent-color); font-size:1rem;"></i>
                        <span style="font-size:0.85rem; font-weight:600;">${u.displayName || u.email} ${isMe ? '(You)' : ''}</span>
                    </div>
                    ${showRemoveAction ? `<button onclick="window.handleKickMember('${chatId}', '${pDoc.id}', '${(u.displayName || 'Cook').replace(/'/g, "\\'")}')" style="background:transparent; color:#ff4500; border:none; padding:4px; cursor:pointer; font-size:1.1rem;"><i class='bx bx-user-minus'></i></button>` : ''}
                </div>
            `;
            rosterContainer.insertAdjacentHTML('beforeend', memberRow);
        });

        // 3. Load user follow list candidates available for invitation
        const myProfileDoc = await db.collection("users").doc(currentUid).get();
        const following = (myProfileDoc.exists && myProfileDoc.data().following) ? myProfileDoc.data().following : [];
        
        // Filter candidate invitations to users who aren't already group members
        const inviteCandidates = following.filter(uid => !activeParticipants.includes(uid));

        if (inviteCandidates.length === 0) {
            candidateContainer.innerHTML = `<p style="font-size:0.75rem; color:var(--text-sec); text-align:center; font-style:italic;">All the cooks you follow are already in this circle.</p>`;
            return;
        }

        const candidatePromises = inviteCandidates.map(uid => db.collection("users").doc(uid).get());
        const candidateDocs = await Promise.all(candidatePromises);

        candidateDocs.forEach(cDoc => {
            if (!cDoc.exists) return;
            const cu = cDoc.data();
            const row = `
                <label style="display:flex; align-items:center; gap:8px; background:var(--bg-color); padding:6px 10px; border-radius:6px; cursor:pointer; font-size:0.8rem;">
                    <input type="checkbox" name="modal-invite-checkbox" value="${cDoc.id}" style="accent-color:var(--accent-color);">
                    <span>${cu.displayName || cu.email}</span>
                </label>
            `;
            candidateContainer.insertAdjacentHTML('beforeend', row);
        });

        if (addBtn) {
            addBtn.style.display = "block";
            addBtn.onclick = () => window.handleInviteSelectedMembers(chatId);
        }

    } catch (err) {
        console.error(err);
        rosterContainer.innerHTML = `<p style="font-size:0.75rem; color:#ff4500; text-align:center;">Failed to initialize roster.</p>`;
    }
};

/**
 * Handles member removal requests.
 */
window.handleKickMember = async (chatId, targetUid, memberName) => {
    const confirm = await window.customConfirm(`Are you sure you want to remove ${memberName} from this cooking circle?`);
    if (confirm) {
        try {
            await removeMemberFromGroup(chatId, targetUid);
            window.showToast(`${memberName} removed from circle.`, "normal");
            // Automatically refresh the active list canvas overlay window state view
            window.openGroupMembersManagement(chatId);
        } catch (err) {
            window.showToast("Failed to remove member: " + err.message, "error");
        }
    }
};

/**
 * Commits the checklist data parameters to append group membership.
 */
window.handleInviteSelectedMembers = async (chatId) => {
    const checked = document.querySelectorAll('input[name="modal-invite-checkbox"]:checked');
    if (checked.length === 0) return window.showToast("Select at least one cook to invite!", "error");

    const targetUids = Array.from(checked).map(cb => cb.value);
    try {
        await addMembersToGroup(chatId, targetUids);
        window.showToast(`Successfully added ${targetUids.length} cooks to the circle!`, "success");
        window.openGroupMembersManagement(chatId);
    } catch (err) {
        window.showToast("Invitation delivery error: " + err.message, "error");
    }
};