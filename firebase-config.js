import { initializeApp } from "firebase/app";
import { 
  getFirestore,
  enableIndexedDbPersistence,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
  connectFirestoreEmulator
} from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Firebase configuration
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

// Initialize Firestore with enhanced offline support
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      tabManager: persistentMultipleTabManager()
    }),
    experimentalForceLongPolling: true // Better for unstable connections
  });

  // Enable persistence with error handling
  const enablePersistence = async () => {
    try {
      await enableIndexedDbPersistence(db, { forceOwnership: false });
      console.log("Firestore persistence enabled");
    } catch (err) {
      if (err.code === 'failed-precondition') {
        console.warn("Persistence already enabled in another tab");
      } else if (err.code === 'unimplemented') {
        console.warn("Persistence not supported in this browser");
      }
    }
  };
  
  await enablePersistence();
} catch (error) {
  console.error("Firestore initialization error:", error);
  // Fallback to regular Firestore if initialization fails
  db = getFirestore(app);
}

// Initialize other Firebase services
const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Emulator connection for development
if (import.meta.env.MODE === 'development') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, "http://localhost:9099");
    connectStorageEmulator(storage, "localhost", 9199);
    connectFunctionsEmulator(functions, "localhost", 5001);
    console.log("Connected to Firebase emulators");
  } catch (emulatorError) {
    console.warn("Failed to connect to emulators:", emulatorError);
  }
}

// Firestore operations with offline support
const firestoreOperations = {
  /**
   * Add a new document to Firestore with offline support
   * @param {string} collection - Collection name
   * @param {object} data - Document data
   * @returns {Promise<string>} Document ID
   */
  async add(collection, data) {
    try {
      const docRef = await addDoc(collection(db, collection), data);
      return docRef.id;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Update a document in Firestore with offline support
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   * @param {object} data - Update data
   */
  async update(collection, id, data) {
    try {
      await updateDoc(doc(db, collection, id), data);
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Delete a document from Firestore with offline support
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   */
  async delete(collection, id) {
    try {
      await deleteDoc(doc(db, collection, id));
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Set up a real-time listener with offline support
   * @param {string} collection - Collection name
   * @param {function} callback - Callback function
   * @returns {function} Unsubscribe function
   */
  onSnapshot(collection, callback) {
    const unsubscribe = onSnapshot(
      collection(db, collection),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(docs);
      },
      (error) => {
        console.error("Listener error:", error);
        this.handleError(error);
      }
    );
    return unsubscribe;
  },

  /**
   * Handle Firestore errors with localized messages
   * @param {Error} error - Original error
   * @returns {object} Processed error with user-friendly message
   */
  handleError(error) {
    const errorMap = {
      'permission-denied': {
        message: "اجازت نہیں ہے - کنفیگریشن چیک کریں",
        severity: "critical",
        canRetry: false
      },
      'unavailable': {
        message: "سروس دستیاب نہیں - آف لائن موڈ میں کام جاری ہے",
        severity: "warning",
        canRetry: true
      },
      'resource-exhausted': {
        message: "سرور پر بوجھ زیادہ ہے، براہ کرم بعد میں کوشش کریں",
        severity: "warning",
        canRetry: true
      },
      'default': {
        message: `فائر بیس کنکشن خرابی: ${error.message}`,
        severity: "error",
        canRetry: true
      }
    };

    const errorInfo = errorMap[error.code] || errorMap.default;
    return {
      ...errorInfo,
      originalError: error,
      timestamp: new Date().toISOString()
    };
  }
};

// Export services and operations
export { 
  app,
  db,
  auth,
  storage,
  functions,
  firestoreOperations
};

// Feature detection for analytics
export async function isAnalyticsSupported() {
  try {
    const { isSupported } = await import('firebase/analytics');
    return isSupported();
  } catch {
    return false;
  }
}
