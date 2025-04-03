import { db } from './firebase-config.js';

// Initialize local database
const localDB = new Dexie("MuradMasalaLocalDB");
localDB.version(2).stores({
    branches: "++id,name,address,image,isDefault,firebaseId,isSynced,lastUpdated",
    syncQueue: "++id,action,collection,data,createdAt,attempts",
    appState: "key,value"
});

// UI Elements
const connectionBanner = document.getElementById('connectionBanner');
const connectionStatus = document.getElementById('connectionStatus');
const syncNowBtn = document.getElementById('syncNowBtn');
const branchesTable = document.getElementById('branchesTable');
const branchFormContainer = document.getElementById('branchFormContainer');

// App State
let isOnline = navigator.onLine;
let activeListeners = [];
let syncInProgress = false;

// Initialize App
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    setupNetworkMonitoring();
    renderBranchForm();
    await loadBranches();
    setupFirestoreListeners();
    startSyncInterval();
    checkInitialSync();
}

// Network Management
function setupNetworkMonitoring() {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    updateConnectionUI();
}

function handleOnline() {
    isOnline = true;
    updateConnectionUI();
    showBanner("آن لائن: تبدیلیاں خودکار طور پر مطابقت پذیر ہو رہی ہیں", "alert-success");
    processSyncQueue();
}

function handleOffline() {
    isOnline = false;
    updateConnectionUI();
    showBanner("آف لائن: تبدیلیاں مقامی طور پر محفوظ ہو رہی ہیں", "alert-warning");
}

function updateConnectionUI() {
    const statusElement = document.getElementById('networkStatus');
    const syncElement = document.getElementById('syncStatus');
    
    if (isOnline) {
        statusElement.textContent = "آن لائن";
        syncElement.className = "badge bg-success";
        syncElement.textContent = "متصّل";
        syncNowBtn.disabled = false;
    } else {
        statusElement.textContent = "آف لائن";
        syncElement.className = "badge bg-danger";
        syncElement.textContent = "منقطع";
        syncNowBtn.disabled = true;
    }
}

// Data Synchronization
async function processSyncQueue() {
    if (syncInProgress || !isOnline) return;
    
    syncInProgress = true;
    syncNowBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> مطابقت پذیری ہو رہی ہے...';
    
    try {
        const pendingItems = await localDB.syncQueue.toArray();
        if (pendingItems.length === 0) {
            updateSyncStatus();
            return;
        }

        for (const item of pendingItems) {
            try {
                await processSyncItem(item);
                await localDB.syncQueue.delete(item.id);
            } catch (error) {
                console.error(`Sync failed for item ${item.id}:`, error);
                await localDB.syncQueue.update(item.id, { 
                    attempts: (item.attempts || 0) + 1,
                    lastError: error.message
                });
            }
        }

        showBanner("مطابقت پذیری کامیاب!", "alert-success");
    } catch (error) {
        console.error("Sync process failed:", error);
        showBanner("مطابقت پذیری میں خرابی", "alert-danger");
    } finally {
        syncInProgress = false;
        syncNowBtn.innerHTML = '<i class="fas fa-sync-alt"></i> فوری مطابقت پذیری';
        await loadBranches();
    }
}

async function processSyncItem(item) {
    // Implementation depends on your Firestore operations
    // Example for branch addition:
    if (item.action === "ADD_BRANCH") {
        const docRef = await addDoc(collection(db, "branches"), item.data);
        await localDB.branches.update(item.data.localId, {
            firebaseId: docRef.id,
            isSynced: true,
            lastUpdated: new Date().toISOString()
        });
    }
    // Similar implementations for UPDATE and DELETE
}

// [Additional helper functions for UI rendering, event handling, etc.]

// Export functions needed in HTML
window.editBranch = editBranch;
window.deleteBranch = deleteBranch;
window.dismissBanner = dismissBanner;
