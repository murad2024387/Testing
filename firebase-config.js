import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBEtLS0v4FJpHy11OsFwAJMUTo4W-ZvxVs",
  authDomain: "muradapps-dbe17.firebaseapp.com",
  projectId: "muradapps-dbe17",
  storageBucket: "muradapps-dbe17.appspot.com",
  messagingSenderId: "117855279460",
  appId: "1:117855279460:web:3403584abd902e5d628271",
  measurementId: "G-8ZY9T7HFWE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { db };
