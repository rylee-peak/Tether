importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js');

// Copy your exact firebaseConfig object here
firebase.initializeApp({
  apiKey: "AIzaSyCL4niDOUs2X8Je7-UmhGGpsowA7CfFAEA",
  authDomain: "ocp-communication-platform.firebaseapp.com",
  projectId: "ocp-communication-platform",
  storageBucket: "ocp-communication-platform.firebasestorage.app",
  messagingSenderId: "825984310844",
  appId: "1:825984310844:web:9174be65ae9a0c08b66d39"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(
    payload.notification?.title || "Tether", 
    { body: payload.notification?.body || "You received a new message.", icon: '/favicon.ico' }
  );
});
