import { db, firebase } from '../config.js';

/**
 * Initializes a new conversation room (Direct Message or Group Chat).
 */
export const createChatRoom = (type, participantIds, groupName = null) => {
    const currentUid = firebase.auth().currentUser.uid;
    const statusMap = {};
    const archiveMap = {};

    participantIds.forEach(uid => {
        // Creator is automatically accepted; others are pending if it's a new direct message request
        statusMap[uid] = (uid === currentUid || type === "group") ? "accepted" : "pending";
        archiveMap[uid] = false;
    });

    return db.collection("chats").add({
        type,
        groupName: type === "group" ? groupName : null,
        participants: participantIds,
        status: statusMap,
        archivedBy: archiveMap,
        blockedBy: [],
        lastMessage: {
            text: type === "group" ? `Created group "${groupName}"` : "Conversation started",
            senderId: currentUid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        },
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
};

/**
 * Sends a message string to a targeted conversation channel.
 */
export const sendMessage = (chatId, text, senderName) => {
    const currentUid = firebase.auth().currentUser.uid;
    const batch = db.batch();
    const chatRef = db.collection("chats").doc(chatId);
    const msgRef = chatRef.collection("messages").doc();

    // 1. Write the message document inside the sub-collection
    batch.set(msgRef, {
        text,
        senderId: currentUid,
        senderName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 2. Update the parent channel's latest message snippet summary
    batch.update(chatRef, {
        "lastMessage.text": text,
        "lastMessage.senderId": currentUid,
        "lastMessage.timestamp": firebase.firestore.FieldValue.serverTimestamp()
    });

    return batch.commit();
};

/**
 * Changes a user's status within a chat channel (e.g., accepting a request).
 */
export const updateChatStatus = (chatId, uid, status) => {
    return db.collection("chats").doc(chatId).update({
        [`status.${uid}`]: status
    });
};

/**
 * Toggles the archival state tracker property for an individual user profile.
 */
export const toggleArchiveState = (chatId, uid, shouldArchive) => {
    return db.collection("chats").doc(chatId).update({
        [`archivedBy.${uid}`]: shouldArchive
    });
};

/**
 * Attaches blocks to individual profile collections to protect users from unwanted communication.
 */
export const addBlockRule = async (myUid, targetUid) => {
    const batch = db.batch();
    batch.set(db.collection("users").doc(myUid), {
        blockedUsers: firebase.firestore.FieldValue.arrayUnion(targetUid)
    }, { merge: true });
    
    return batch.commit();
};

/**
 * Appends new user profiles to an existing group conversation channel array.
 * @param {string} chatId 
 * @param {string[]} newUserIds 
 * @returns {Promise<void>}
 */
export const addMembersToGroup = async (chatId, newUserIds) => {
    const chatRef = db.collection("chats").doc(chatId);
    const updates = {
        participants: firebase.firestore.FieldValue.arrayUnion(...newUserIds)
    };

    // Initialize mapping keys for the new members
    newUserIds.forEach(uid => {
        updates[`status.${uid}`] = "accepted";
        updates[`archivedBy.${uid}`] = false;
    });

    return chatRef.update(updates);
};

/**
 * Removes a target user from the group participant list and deletes their tracking keys.
 * @param {string} chatId 
 * @param {string} targetUid 
 * @returns {Promise<void>}
 */
export const removeMemberFromGroup = async (chatId, targetUid) => {
    const chatRef = db.collection("chats").doc(chatId);
    
    return chatRef.update({
        participants: firebase.firestore.FieldValue.arrayRemove(targetUid),
        [`status.${targetUid}`]: firebase.firestore.FieldValue.delete(),
        [`archivedBy.${targetUid}`]: firebase.firestore.FieldValue.delete()
    });
};