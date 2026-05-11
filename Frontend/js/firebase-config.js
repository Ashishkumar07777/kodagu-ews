import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDWHC2fH42FRTF0NyW9e0K0VtrTiaWiYiE",
  authDomain: "kodagu-ews-7341e.firebaseapp.com",
  projectId: "kodagu-ews-7341e",
  storageBucket: "kodagu-ews-7341e.firebasestorage.app",
  messagingSenderId: "708141976547",
  appId: "1:708141976547:web:9367338c7b60a63458aed6"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
