import { auth, db } from '../config.js';
import { sendMessage } from '../services/chatService.js';

window.activeInboxTab = 'active';

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

    // Listen to channels where the current user is an active participant list item
    db.collection("chats")
      .where("participants", "array-contains", user.uid)
      .orderBy("lastMessage.timestamp", "desc")
      .onSnapshot((snap) => {
          listContainer.innerHTML = "";
          
          let counter = 0;
          snap.forEach((doc) => {
              const chat = doc.data();
              const chatId = doc.id;

              // Extract channel states properties maps safely
              const status = chat.status?.[user.uid] || "accepted";
              const isArchived = chat.archivedBy?.[user.uid] || false;
              const textSnippet = chat.lastMessage?.text || "No messages yet...";

              // Run tab distribution filter rules calculations
              if (window.activeInboxTab === 'active' && (status !== 'accepted' || isArchived)) return;
              if (window.activeInboxTab === 'requests' && status !== 'pending') return;
              if (window.activeInboxTab === 'archived' && !isArchived) return;

              counter++;
              
              // Handle title variations cleanly based on channel typing rules
              let chatTitle = chat.groupName || "Direct Message";
              let iconClass = chat.type === "group" ? "bx-group" : "bx-user";
              let colorAccent = chat.type === "group" ? "var(--accent-color)" : "var(--text-sec)";

              let actionButtonsHTML = "";
              if (window.activeInboxTab === 'requests') {
                  actionButtonsHTML = `<button onclick="window.acceptMessageRequest('${chatId}')" style="background:var(--accent-color); color:white; border:none; padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:bold; cursor:pointer;">Accept</button>`;
              } else if (window.activeInboxTab === 'active') {
                  actionButtonsHTML = `<button onclick="window.archiveChatChannel('${chatId}')" style="background:transparent; border:1px solid var(--border-color); color:var(--text-sec); padding:4px 8px; border-radius:12px; font-size:0.7rem; cursor:pointer;"><i class='bx bx-archive-in'></i> Archive</button>`;
              }

              const cardHTML = `
                <div class="inbox-card-item" onclick="window.router('/messages/${chatId}')" style="display:flex; align-items:center; justify-content:space-between; padding:12px 15px; background:var(--card-bg); border:1px solid var(--border-color); border-radius:10px; cursor:pointer; transition:transform 0.15s;">
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
          });

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

    // Fetch header meta tracking cards fields
    db.collection("chats").doc(chatId).get().then((doc) => {
        if (doc.exists) {
            const chat = doc.data();
            headerName.innerText = chat.groupName || "Direct Message Thread";
        }
    });

    // Real-time stream monitor binding
    db.collection("chats").doc(chatId).collection("messages")
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
    
    // Check if a 1-on-1 direct channel record blueprint already exists between these profiles
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
              // Create the brand-new message request pipeline mapping channel
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