const admin = require('firebase-admin');

// 1. Ensure serviceAccountKey.json is in the exact same folder as this script.
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();

// VERY IMPORTANT: This must match the appId in your frontend index.html
const APP_ID = 'tether-production'; 
const queueRef = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('pending_notifications');

console.log("Listening for new messages in the Tether queue...");

// Listen to the specific artifacts queue 24/7
queueRef.onSnapshot((snapshot) => {
  snapshot.docChanges().forEach(async (change) => {
    if (change.type === 'added') {
      const notificationData = change.doc.data();
      const docId = change.doc.id;
      
      try {
        await processNotification(notificationData);
      } catch(e) {
        console.error("Error sending push:", e);
      } finally {
        // Delete the task from the queue so we don't send it twice
        await queueRef.doc(docId).delete();
      }
    }
  });
});

async function processNotification(data) {
    const { chatId, senderId, senderName, text, attachmentUrl } = data;
    let uidsToNotify = [];

    // Navigate to the correct artifacts folder to find the chat participants
    if (chatId.includes('dm_') || chatId.includes('groupchat_')) {
      const dmDoc = await db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('messages_dms_directory').doc(chatId).get();
      if (dmDoc.exists) {
        uidsToNotify = dmDoc.data().users.filter(id => id !== senderId);
      }
    } else {
      const rosterSnap = await db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection(`messages_roster_${chatId}`).get();
      uidsToNotify = rosterSnap.docs.map(d => d.id).filter(id => id !== senderId);
    }

    if (uidsToNotify.length === 0) return;

    // Grab the actual device tokens from the nested users folder
    const tokens = [];
    for (const uid of uidsToNotify) {
      const tokenDocRef = await db.collection('artifacts').doc(APP_ID).collection('users').doc(uid).collection('fcmTokens').doc('current').get();
      if (tokenDocRef.exists && tokenDocRef.data().token) {
        tokens.push(tokenDocRef.data().token);
      }
    }

    if (tokens.length === 0) return;

    // MODERN PAYLOAD FORMAT
    const message = {
      notification: {
        title: senderName || 'New Message',
        body: text ? text : 'Sent an attachment',
      },
      webpush: {
        headers: { Urgency: 'high' },
        notification: { icon: '/favicon.ico' }
      },
      tokens: tokens
    };

    try {
      const response = await messaging.sendEachForMulticast(message);
      console.log(`Sent notification. Success: ${response.successCount}, Failure: ${response.failureCount}`);
      
      if (response.failureCount > 0) {
        response.responses.forEach((resp) => {
          if (!resp.success) {
            console.error("Apple/Google rejected token:", resp.error.message);
          }
        });
      }
    } catch(e) {
      console.error("Fatal error sending multicast:", e);
    }
}
