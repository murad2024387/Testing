// Import the required Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
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
let db;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
  throw new Error("فائر بیس کو شروع کرنے میں ناکامی۔ براہ کرم بعد میں کوشش کریں۔");
}

/**
 * Adds a new branch to Firestore
 * @param {Object} branchData - Branch data to add
 * @returns {Promise<string>} Document ID of the new branch
 */
async function addBranch(branchData) {
  try {
    const docRef = await addDoc(collection(db, "branches"), {
      ...branchData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding branch:", error);
    throw new Error("برانچ شامل کرنے میں ناکامی۔ براہ کرم دوبارہ کوشش کریں۔");
  }
}

/**
 * Updates an existing branch in Firestore
 * @param {string} branchId - ID of the branch to update
 * @param {Object} updatedData - New branch data
 * @returns {Promise<void>}
 */
async function updateBranch(branchId, updatedData) {
  try {
    await updateDoc(doc(db, "branches", branchId), {
      ...updatedData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating branch:", error);
    throw new Error("برانچ اپ ڈیٹ کرنے میں ناکامی۔ براہ کرم دوبارہ کوشش کریں۔");
  }
}

/**
 * Deletes a branch from Firestore
 * @param {string} branchId - ID of the branch to delete
 * @returns {Promise<void>}
 */
async function deleteBranch(branchId) {
  try {
    await deleteDoc(doc(db, "branches", branchId));
  } catch (error) {
    console.error("Error deleting branch:", error);
    throw new Error("برانچ حذف کرنے میں ناکامی۔ براہ کرم دوبارہ کوشش کریں۔");
  }
}

/**
 * Sets up a real-time listener for branches
 * @param {Function} callback - Function to call with branch data
 * @returns {Function} Unsubscribe function
 */
function setupBranchesListener(callback) {
  try {
    return onSnapshot(collection(db, "branches"), (snapshot) => {
      const branches = [];
      snapshot.forEach((doc) => {
        branches.push({ 
          id: doc.id, 
          ...doc.data(),
          // Convert Firestore timestamps to JavaScript Dates
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        });
      });
      callback(branches);
    }, (error) => {
      console.error("Error in branches listener:", error);
    });
  } catch (error) {
    console.error("Error setting up branches listener:", error);
    throw new Error("ریل ٹائم ڈیٹا حاصل کرنے میں ناکامی۔");
  }
}

/**
 * Checks Firebase connection status
 * @returns {Promise<boolean>} True if connected, false otherwise
 */
async function checkFirebaseConnection() {
  try {
    // Attempt a simple read operation to test connection
    await new Promise((resolve, reject) => {
      const unsubscribe = onSnapshot(collection(db, "branches"), 
        () => {
          unsubscribe();
          resolve(true);
        },
        (error) => {
          unsubscribe();
          reject(error);
        }
      );
    });
    return true;
  } catch (error) {
    console.error("Firebase connection check failed:", error);
    return false;
  }
}

// Export the functions to be used in other files
export { 
  db,
  addBranch,
  updateBranch,
  deleteBranch,
  setupBranchesListener,
  checkFirebaseConnection
};
