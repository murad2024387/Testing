import { 
  addBranch,
  updateBranch,
  deleteBranch,
  setupBranchesListener
} from './firebase-config.js';

// Initialize Dexie.js for local database
const localDB = new Dexie("MuradMasalaDB");
localDB.version(1).stores({
  branches: "++id,name,address,isDefault,firebaseId,isSynced,createdAt",
  syncQueue: "++id,action,collection,data,createdAt"
});

// DOM Elements
const branchForm = document.getElementById('branchForm');
const branchNameInput = document.getElementById('branchName');
const branchAddressInput = document.getElementById('branchAddress');
const isDefaultCheckbox = document.getElementById('isDefault');
const branchesTable = document.getElementById('branchesTable').getElementsByTagName('tbody')[0];
const syncStatus = document.getElementById('syncStatus');
const syncButton = document.getElementById('syncButton');

// Event Listeners
branchForm.addEventListener('submit', handleBranchSubmit);
syncButton.addEventListener('click', syncWithFirebase);
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

// Initialize the app
async function initApp() {
  updateNetworkStatus();
  await loadBranches();
  setupRealTimeListener();
  checkAndSync();
}

// Handle branch form submission
async function handleBranchSubmit(e) {
  e.preventDefault();
  
  const branchData = {
    name: branchNameInput.value.trim(),
    address: branchAddressInput.value.trim(),
    isDefault: isDefaultCheckbox.checked,
    isSynced: false,
    createdAt: new Date().toISOString()
  };

  try {
    // Validate inputs
    if (!branchData.name || !branchData.address) {
      throw new Error("برانچ کا نام اور پتہ ضروری ہیں");
    }

    // Save to local database
    const id = await localDB.branches.add(branchData);
    
    // Add to sync queue
    await localDB.syncQueue.add({
      action: "ADD",
      collection: "branches",
      data: { ...branchData, id },
      createdAt: new Date().toISOString()
    });

    // Sync immediately if online
    if (navigator.onLine) {
      await syncWithFirebase();
    }

    // Reset form
    branchForm.reset();
    await loadBranches();
    
    // Show success message
    showToast("برانچ کامیابی سے محفوظ ہو گئی");
  } catch (error) {
    console.error("Error saving branch:", error);
    showToast(`محفوظ کرنے میں خرابی: ${error.message}`, "error");
  }
}

// Load branches from local database
async function loadBranches() {
  try {
    const branches = await localDB.branches
      .orderBy('createdAt')
      .reverse()
      .toArray();
    
    renderBranches(branches);
  } catch (error) {
    console.error("Error loading branches:", error);
    showToast("برانچز لوڈ کرنے میں خرابی", "error");
  }
}

// Render branches to the table
function renderBranches(branches) {
  branchesTable.innerHTML = branches.map(branch => `
    <tr>
      <td>${branch.name}</td>
      <td>${branch.address}</td>
      <td>${branch.isDefault ? 'ہاں' : 'نہیں'}</td>
      <td>${branch.isSynced ? 'مطابقت پذیر' : 'مطابقت پذیری باقی'}</td>
      <td>
        <button class="edit-btn" onclick="editBranch('${branch.id}')">ترمیم</button>
        <button class="delete-btn" onclick="deleteBranch('${branch.id}')">حذف</button>
      </td>
    </tr>
  `).join('');
}

// Sync local changes with Firebase
async function syncWithFirebase() {
  try {
    if (!navigator.onLine) {
      showToast("آپ آف لائن ہیں۔ مطابقت پذیری کے لیے آن لائن ہوں", "warning");
      return;
    }

    showToast("مطابقت پذیری شروع ہو رہی ہے...", "info");
    
    const pendingItems = await localDB.syncQueue
      .orderBy('createdAt')
      .toArray();
    
    if (pendingItems.length === 0) {
      showToast("کوئی مطابقت پذیری باقی نہیں ہے", "info");
      return;
    }

    for (const item of pendingItems) {
      try {
        switch (item.action) {
          case "ADD":
            const firebaseId = await addBranch(item.data);
            await localDB.branches.update(item.data.id, { 
              isSynced: true,
              firebaseId: firebaseId
            });
            break;
            
          case "UPDATE":
            if (!item.data.firebaseId) {
              throw new Error("فائر بیس آئی ڈی دستیاب نہیں");
            }
            await updateBranch(item.data.firebaseId, item.data);
            await localDB.branches.update(item.data.id, { isSynced: true });
            break;
            
          case "DELETE":
            if (item.data.firebaseId) {
              await deleteBranch(item.data.firebaseId);
            }
            await localDB.branches.delete(item.data.id);
            break;
        }
        
        await localDB.syncQueue.delete(item.id);
      } catch (error) {
        console.error(`Error syncing ${item.action} action:`, error);
        // Continue with next item even if one fails
      }
    }
    
    await loadBranches();
    showToast("مطابقت پذیری مکمل ہو گئی", "success");
  } catch (error) {
    console.error("Error during sync:", error);
    showToast(`مطابقت پذیری میں خرابی: ${error.message}`, "error");
  }
}

// Set up real-time listener for Firebase changes
function setupRealTimeListener() {
  setupBranchesListener(async (firebaseBranches) => {
    try {
      // Update local database with changes from Firebase
      for (const fbBranch of firebaseBranches) {
        const existingBranch = await localDB.branches
          .where("firebaseId")
          .equals(fbBranch.id)
          .first();
        
        if (!existingBranch) {
          // New branch added from another device
          await localDB.branches.add({
            ...fbBranch,
            firebaseId: fbBranch.id,
            isSynced: true,
            createdAt: new Date().toISOString()
          });
        } else if (fbBranch.updatedAt > existingBranch.createdAt) {
          // Branch updated from another device
          await localDB.branches.update(existingBranch.id, {
            ...fbBranch,
            isSynced: true
          });
        }
      }
      
      // Remove branches deleted from other devices
      const localBranches = await localDB.branches.toArray();
      const firebaseIds = firebaseBranches.map(b => b.id);
      
      for (const localBranch of localBranches) {
        if (localBranch.firebaseId && !firebaseIds.includes(localBranch.firebaseId)) {
          await localDB.branches.delete(localBranch.id);
        }
      }
      
      await loadBranches();
    } catch (error) {
      console.error("Error in real-time listener:", error);
    }
  });
}

// Update network status display
function updateNetworkStatus() {
  if (navigator.onLine) {
    syncStatus.textContent = "حالت: آن لائن";
    syncStatus.className = "sync-status online";
    syncButton.style.display = "none";
    checkAndSync();
  } else {
    syncStatus.textContent = "حالت: آف لائن (تبدیلیاں مقامی طور پر محفوظ ہو رہی ہیں)";
    syncStatus.className = "sync-status offline";
    syncButton.style.display = "inline-block";
  }
}

// Check if there are pending sync items and sync if online
async function checkAndSync() {
  if (navigator.onLine) {
    const pendingItems = await localDB.syncQueue.count();
    if (pendingItems > 0) {
      syncWithFirebase();
    }
  }
}

// Show toast notification
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add("show");
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }, 100);
}

// Edit branch function
window.editBranch = async function(branchId) {
  const branch = await localDB.branches.get(branchId);
  if (!branch) return;

  branchNameInput.value = branch.name;
  branchAddressInput.value = branch.address;
  isDefaultCheckbox.checked = branch.isDefault;
  
  // Change form to update mode
  branchForm.dataset.editId = branchId;
  const submitBtn = branchForm.querySelector('button[type="submit"]');
  submitBtn.textContent = "اپ ڈیٹ کریں";
  submitBtn.style.backgroundColor = "#2196F3";
  
  // Scroll to form
  branchForm.scrollIntoView({ behavior: 'smooth' });
  
  // Remove previous submit listener
  branchForm.removeEventListener('submit', handleBranchSubmit);
  
  // Add update listener
  branchForm.addEventListener('submit', async function updateHandler(e) {
    e.preventDefault();
    
    const updatedData = {
      name: branchNameInput.value.trim(),
      address: branchAddressInput.value.trim(),
      isDefault: isDefaultCheckbox.checked,
      isSynced: false,
      updatedAt: new Date().toISOString()
    };
    
    try {
      // Validate inputs
      if (!updatedData.name || !updatedData.address) {
        throw new Error("برانچ کا نام اور پتہ ضروری ہیں");
      }

      // Update local database
      await localDB.branches.update(branchId, updatedData);
      
      // Add to sync queue
      await localDB.syncQueue.add({
        action: "UPDATE",
        collection: "branches",
        data: { 
          ...updatedData, 
          id: branchId, 
          firebaseId: branch.firebaseId 
        },
        createdAt: new Date().toISOString()
      });
      
      // Sync if online
      if (navigator.onLine) {
        await syncWithFirebase();
      }
      
      // Reset form
      branchForm.reset();
      branchForm.removeEventListener('submit', updateHandler);
      branchForm.addEventListener('submit', handleBranchSubmit);
      delete branchForm.dataset.editId;
      submitBtn.textContent = "محفوظ کریں";
      submitBtn.style.backgroundColor = "";
      
      await loadBranches();
      showToast("برانچ کامیابی سے اپ ڈیٹ ہو گئی");
    } catch (error) {
      console.error("Error updating branch:", error);
      showToast(`اپ ڈیٹ کرنے میں خرابی: ${error.message}`, "error");
    }
  });
};

// Delete branch function
window.deleteBranch = async function(branchId) {
  if (!confirm("کیا آپ واقعی اس برانچ کو حذف کرنا چاہتے ہیں؟")) return;

  try {
    const branch = await localDB.branches.get(branchId);
    
    // Add to sync queue
    await localDB.syncQueue.add({
      action: "DELETE",
      collection: "branches",
      data: { 
        id: branchId, 
        firebaseId: branch?.firebaseId 
      },
      createdAt: new Date().toISOString()
    });
    
    // Delete from local database
    await localDB.branches.delete(branchId);
    
    // Sync if online
    if (navigator.onLine) {
      await syncWithFirebase();
    }
    
    await loadBranches();
    showToast("برانچ کامیابی سے حذف ہو گئی");
  } catch (error) {
    console.error("Error deleting branch:", error);
    showToast(`حذف کرنے میں خرابی: ${error.message}`, "error");
  }
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Add CSS for toast notifications
const style = document.createElement('style');
style.textContent = `
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 4px;
  color: white;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 1000;
  max-width: 80%;
  text-align: center;
}
.toast.show {
  opacity: 1;
}
.toast-success {
  background-color: #4CAF50;
}
.toast-error {
  background-color: #f44336;
}
.toast-warning {
  background-color: #ff9800;
}
.toast-info {
  background-color: #2196F3;
}
`;
document.head.appendChild(style);
