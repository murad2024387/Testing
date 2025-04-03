// ====================
// Firebase Initialization
// ====================
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
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ====================
// Local Database Setup (Dexie.js)
// ====================
const localDB = new Dexie("MuradMasalaDB");
localDB.version(2).stores({
  branches: "++id, name, address, isDefault, firebaseId, isSynced, lastUpdated",
  syncQueue: "++id, action, collection, data, createdAt, attempts, lastError"
});

// ====================
// DOM Elements
// ====================
const connectionAlert = document.getElementById('connectionAlert');
const connectionStatusText = document.getElementById('connectionStatusText');
const dismissAlertBtn = document.getElementById('dismissAlertBtn');
const networkStatus = document.getElementById('networkStatus');
const localDataStatus = document.getElementById('localDataStatus');
const cloudDataStatus = document.getElementById('cloudDataStatus');
const branchForm = document.getElementById('branchForm');
const branchNameInput = document.getElementById('branchName');
const branchAddressInput = document.getElementById('branchAddress');
const isDefaultCheckbox = document.getElementById('isDefault');
const submitBtn = document.getElementById('submitBtn');
const submitBtnText = document.getElementById('submitBtnText');
const submitSpinner = document.getElementById('submitSpinner');
const syncBtn = document.getElementById('syncBtn');
const branchesTableBody = document.getElementById('branchesTable').querySelector('tbody');

// ====================
// App State
// ====================
let isOnline = navigator.onLine;
let isFirebaseConnected = false;
let editMode = false;
let currentEditId = null;
const activeListeners = [];

// ====================
// Initialization
// ====================
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  setupEventListeners();
  setupNetworkMonitoring();
  await checkFirebaseConnection();
  await loadBranches();
  setupFirestoreListeners();
  startSyncInterval();
}

// ====================
// Event Listeners
// ====================
function setupEventListeners() {
  // Network events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  dismissAlertBtn.addEventListener('click', dismissAlert);
  
  // Form submission
  branchForm.addEventListener('submit', handleFormSubmit);
  
  // Sync button
  syncBtn.addEventListener('click', manualSync);
}

// ====================
// Network Monitoring
// ====================
function setupNetworkMonitoring() {
  updateConnectionUI();
}

async function checkFirebaseConnection() {
  try {
    // Test Firestore connection
    await db.collection("connectionTest").doc("test").get({ source: "default" });
    isFirebaseConnected = true;
    updateConnectionUI();
    return true;
  } catch (error) {
    isFirebaseConnected = false;
    updateConnectionUI();
    return false;
  }
}

function handleOnline() {
  isOnline = true;
  updateConnectionUI();
  checkFirebaseConnection();
  processSyncQueue();
}

function handleOffline() {
  isOnline = false;
  isFirebaseConnected = false;
  updateConnectionUI();
}

function updateConnectionUI() {
  if (!isOnline) {
    showAlert("آف لائن: تبدیلیاں مقامی طور پر محفوظ ہو رہی ہیں", "offline");
    networkStatus.textContent = "آف لائن";
    networkStatus.className = "badge bg-danger";
    return;
  }

  if (isFirebaseConnected) {
    showAlert("آن لائن: فائر بیس سے منسلک", "online");
    networkStatus.textContent = "آن لائن";
    networkStatus.className = "badge bg-success";
  } else {
    showAlert("کنکشن مسائل: مقامی ڈیٹا استعمال ہو رہا ہے", "warning");
    networkStatus.textContent = "مسائل";
    networkStatus.className = "badge bg-warning";
  }
}

function showAlert(message, type) {
  connectionAlert.style.display = "flex";
  connectionAlert.className = `connection-alert alert-${type}`;
  connectionStatusText.textContent = message;
}

function dismissAlert() {
  connectionAlert.style.display = "none";
}

// ====================
// Branch Management
// ====================
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const branchData = {
    name: branchNameInput.value,
    address: branchAddressInput.value,
    isDefault: isDefaultCheckbox.checked,
    lastUpdated: new Date().toISOString()
  };

  // Show loading state
  submitBtn.disabled = true;
  submitBtnText.textContent = editMode ? "اپ ڈیٹ ہو رہا ہے..." : "محفوظ ہو رہا ہے...";
  submitSpinner.style.display = "inline-block";

  try {
    if (editMode) {
      await updateBranch(currentEditId, branchData);
    } else {
      await addBranch(branchData);
    }
    
    // Reset form
    branchForm.reset();
    editMode = false;
    currentEditId = null;
    submitBtnText.textContent = "محفوظ کریں";
  } catch (error) {
    console.error("Error saving branch:", error);
    showAlert(`محفوظ کرنے میں خرابی: ${error.message}`, "error");
  } finally {
    submitBtn.disabled = false;
    submitSpinner.style.display = "none";
    submitBtnText.textContent = "محفوظ کریں";
  }
}

async function addBranch(branchData) {
  // Add to local DB
  const localId = await localDB.branches.add({
    ...branchData,
    isSynced: false,
    firebaseId: null
  });

  // Add to sync queue
  await localDB.syncQueue.add({
    action: "ADD",
    collection: "branches",
    data: { ...branchData, localId },
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null
  });

  // If online, sync immediately
  if (isOnline && isFirebaseConnected) {
    await processSyncQueue();
  }

  await loadBranches();
}

async function updateBranch(branchId, updatedData) {
  // Update in local DB
  await localDB.branches.update(branchId, {
    ...updatedData,
    isSynced: false
  });

  // Get current branch data
  const branch = await localDB.branches.get(branchId);

  // Add to sync queue
  await localDB.syncQueue.add({
    action: "UPDATE",
    collection: "branches",
    data: { ...updatedData, id: branchId, firebaseId: branch.firebaseId },
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null
  });

  // If online, sync immediately
  if (isOnline && isFirebaseConnected) {
    await processSyncQueue();
  }

  await loadBranches();
}

async function deleteBranch(branchId) {
  if (!confirm("کیا آپ واقعی اس برانچ کو حذف کرنا چاہتے ہیں؟")) return;

  const branch = await localDB.branches.get(branchId);
  
  // Add to sync queue
  await localDB.syncQueue.add({
    action: "DELETE",
    collection: "branches",
    data: { id: branchId, firebaseId: branch?.firebaseId },
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null
  });

  // Delete from local DB
  await localDB.branches.delete(branchId);

  // If online, sync immediately
  if (isOnline && isFirebaseConnected) {
    await processSyncQueue();
  }

  await loadBranches();
}

// ====================
// Data Loading
// ====================
async function loadBranches() {
  try {
    // Load from local DB
    const localBranches = await localDB.branches.toArray();
    renderBranches(localBranches);
    localDataStatus.textContent = localBranches.length;

    // Load from Firestore if online
    if (isOnline && isFirebaseConnected) {
      const snapshot = await db.collection("branches").get();
      cloudDataStatus.textContent = snapshot.size;
    }
  } catch (error) {
    console.error("Error loading branches:", error);
    showAlert("ڈیٹا لوڈ کرنے میں خرابی", "error");
  }
}

function renderBranches(branches) {
  branchesTableBody.innerHTML = branches.map(branch => `
    <tr>
      <td>${branch.name}</td>
      <td>${branch.address}</td>
      <td>${branch.isDefault ? 'ہاں' : 'نہیں'}</td>
      <td>
        <span class="badge ${branch.isSynced ? 'bg-success' : 'bg-warning'}">
          ${branch.isSynced ? 'مطابقت پذیر' : 'مطابقت پذیری باقی'}
        </span>
      </td>
      <td class="action-btns">
        <button onclick="editBranch('${branch.id}')" class="btn btn-sm btn-primary">
          <i class="fas fa-edit"></i> ترمیم
        </button>
        <button onclick="deleteBranch('${branch.id}')" class="btn btn-sm btn-danger">
          <i class="fas fa-trash"></i> حذف
        </button>
      </td>
    </tr>
  `).join('');
}

// ====================
// Sync Functions
// ====================
function startSyncInterval() {
  // Sync every 2 minutes when online
  setInterval(async () => {
    if (isOnline && isFirebaseConnected) {
      await processSyncQueue();
    }
  }, 120000);
}

async function manualSync() {
  if (!isOnline) {
    showAlert("آپ آف لائن ہیں۔ مطابقت پذیری کے لیے آن لائن ہوں", "warning");
    return;
  }

  syncBtn.disabled = true;
  syncBtn.querySelector('span').textContent = "مطابقت پذیری ہو رہی ہے...";
  syncBtn.querySelector('.spinner').style.display = "inline-block";

  try {
    await processSyncQueue();
    showAlert("مطابقت پذیری کامیاب!", "success");
  } catch (error) {
    console.error("Sync failed:", error);
    showAlert(`مطابقت پذیری میں خرابی: ${error.message}`, "error");
  } finally {
    syncBtn.disabled = false;
    syncBtn.querySelector('span').textContent = "مطابقت پذیری";
    syncBtn.querySelector('.spinner').style.display = "none";
  }
}

async function processSyncQueue() {
  if (!isOnline || !isFirebaseConnected) return;

  const pendingItems = await localDB.syncQueue.toArray();
  if (pendingItems.length === 0) return;

  for (const item of pendingItems) {
    try {
      switch (item.action) {
        case "ADD":
          const docRef = await db.collection(item.collection).add(item.data);
          await localDB.branches.update(item.data.localId, {
            firebaseId: docRef.id,
            isSynced: true
          });
          break;
          
        case "UPDATE":
          await db.collection(item.collection).doc(item.data.firebaseId).update(item.data);
          await localDB.branches.update(item.data.id, { isSynced: true });
          break;
          
        case "DELETE":
          if (item.data.firebaseId) {
            await db.collection(item.collection).doc(item.data.firebaseId).delete();
          }
          break;
      }
      
      // Remove from queue if successful
      await localDB.syncQueue.delete(item.id);
    } catch (error) {
      console.error(`Error syncing ${item.action} action:`, error);
      
      // Update attempt count
      await localDB.syncQueue.update(item.id, { 
        attempts: item.attempts + 1,
        lastError: error.message
      });
      
      // If too many attempts, give up
      if (item.attempts >= 3) {
        await localDB.syncQueue.delete(item.id);
      }
    }
  }

  await loadBranches();
}

// ====================
// Firestore Listeners
// ====================
function setupFirestoreListeners() {
  if (!isOnline) return;

  const unsubscribe = db.collection("branches").onSnapshot(
    (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added" || change.type === "modified") {
          // Check if this came from our own sync to avoid loops
          const isLocalChange = await localDB.syncQueue
            .where("data.firebaseId").equals(change.doc.id)
            .first();
          
          if (!isLocalChange) {
            // Update local DB
            const data = change.doc.data();
            const existing = await localDB.branches
              .where("firebaseId").equals(change.doc.id)
              .first();
            
            if (existing) {
              await localDB.branches.update(existing.id, {
                ...data,
                isSynced: true
              });
            } else {
              await localDB.branches.add({
                ...data,
                firebaseId: change.doc.id,
                isSynced: true
              });
            }
          }
        }
      });
    },
    (error) => {
      console.error("Firestore listener error:", error);
    }
  );

  activeListeners.push(unsubscribe);
}

// ====================
// Global Functions
// ====================
window.editBranch = async function(branchId) {
  const branch = await localDB.branches.get(branchId);
  if (branch) {
    branchNameInput.value = branch.name;
    branchAddressInput.value = branch.address;
    isDefaultCheckbox.checked = branch.isDefault;
    
    editMode = true;
    currentEditId = branchId;
    submitBtnText.textContent = "اپ ڈیٹ کریں";
    
    // Scroll to form
    branchForm.scrollIntoView({ behavior: 'smooth' });
  }
};

window.deleteBranch = async function(branchId) {
  await deleteBranch(branchId);
};

// Cleanup listeners when page unloads
window.addEventListener('beforeunload', () => {
  activeListeners.forEach(unsubscribe => unsubscribe());
});
