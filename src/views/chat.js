import { auth, db } from './config.js';

window.startChat = (targetUserId, targetUserName) => {
    const user = auth.currentUser;
    if (!user) return window.showToast("Please login to message", "error"); // <--- TOAST
    if (user.uid === targetUserId) return window.showToast("You cannot message yourself", "error"); // <--- TOAST

    const chatId = user.uid < targetUserId ? `${user.uid}_${targetUserId}` : `${targetUserId}_${user.uid}`;
    const chatRef = db.collection("chats").doc(chatId);
    
    chatRef.get().then((doc) => {
        if (!doc.exists) {
            chatRef.set({
                users: [user.uid, targetUserId],
                userNames: { [user.uid]: user.displayName || "User", [targetUserId]: targetUserName },
                lastMessage: "Started conversation",
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => window.router(`/messages/${chatId}`));
        } else {
            window.router(`/messages/${chatId}`);
        }
    });
};

export const loadInbox = () => {
    const user = auth.currentUser;
    if (!user) return; 
    
    const inboxContainer = document.getElementById("inbox-list");
    if (!inboxContainer) return;

    db.collection("chats").where("users", "array-contains", user.uid)
      .orderBy("lastUpdated", "desc")
      .onSnapshot((snap) => {
          inboxContainer.innerHTML = "";
          if (snap.empty) {
              inboxContainer.innerHTML = "<p style='padding:20px; color:#888;'>No messages yet.</p>";
              return;
          }

          snap.forEach((doc) => {
              const data = doc.data();
              const otherId = data.users.find(id => id !== user.uid);
              const otherName = data.userNames[otherId] || "Chef";
              const isUnread = data.unreadFor && data.unreadFor.includes(user.uid);
              const boldStyle = isUnread ? "font-weight:bold; color: var(--text-main);" : "color: var(--text-sec);";
              const indicator = isUnread ? "<div style='width:10px; height:10px; background:#ff4500; border-radius:50%; margin-right:10px;'></div>" : "";

              inboxContainer.innerHTML += `
              <div onclick="window.router('/messages/${doc.id}')" style="padding: 15px; border-bottom: 1px solid var(--border-color); cursor: pointer; background: var(--card-bg); display:flex; align-items:center; justify-content:space-between;">
                  <div style="display:flex; align-items:center;">
                    ${indicator}
                    <div>
                        <div style="font-weight: bold;">${otherName}</div>
                        <div style="font-size: 0.85rem; ${boldStyle} margin-top:3px;">${data.lastMessage}</div>
                    </div>
                  </div>
                  <i class='bx bx-chevron-right' style="color:var(--text-sec);"></i>
              </div>`;
          });
      });
};

export const loadChatRoom = (chatId) => {
    const user = auth.currentUser;
    if (!user) return; 

    window.currentChatId = chatId;

    db.collection("chats").doc(chatId).update({
        unreadFor: firebase.firestore.FieldValue.arrayRemove(user.uid)
    });

    const messagesContainer = document.getElementById("chat-messages");
    const headerName = document.getElementById("chat-header-name");
    
    db.collection("chats").doc(chatId).get().then((doc) => {
        if (doc.exists && headerName) {
            const data = doc.data();
            const otherId = data.users.find(id => id !== user.uid);
            headerName.innerText = data.userNames[otherId] || "Chef";
        }
    });

    db.collection("chats").doc(chatId).collection("messages")
      .orderBy("createdAt", "asc")
      .onSnapshot((snap) => {
          messagesContainer.innerHTML = "";
          snap.forEach((doc) => {
              const msg = doc.data();
              const isMe = msg.senderId === user.uid;
              const align = isMe ? "flex-end" : "flex-start";
              const bg = isMe ? "var(--accent-color)" : "var(--card-bg)";
              const color = isMe ? "white" : "var(--text-main)";
              const border = isMe ? "none" : "1px solid var(--border-color)";
              
              messagesContainer.innerHTML += `
              <div style="display: flex; justify-content: ${align}; margin-bottom: 10px;">
                  <div style="background: ${bg}; color: ${color}; border: ${border}; padding: 8px 14px; border-radius: 18px; max-width: 75%; font-size: 0.95rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    ${msg.text}
                  </div>
              </div>`;
          });
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
      });
};

window.sendChatMessage = () => {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    const user = auth.currentUser;
    const chatId = window.currentChatId || window.location.hash.split('/')[2];

    if (!text || !user || !chatId) return;

    input.value = ""; 

    db.collection("chats").doc(chatId).collection("messages").add({
        text: text,
        senderId: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    const [u1, u2] = chatId.split('_');
    const recipientId = u1 === user.uid ? u2 : u1;

    db.collection("chats").doc(chatId).update({
        lastMessage: text,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        unreadFor: firebase.firestore.FieldValue.arrayUnion(recipientId)
    });
};

window.loadInbox = loadInbox;
window.loadChatRoom = loadChatRoom;