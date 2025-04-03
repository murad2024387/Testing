import { db } from './firebase.config.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';

// DOM Elements
const connectionStatus = document.getElementById('connection-status');
const branchForm = document.getElementById('branch-form');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const branchList = document.getElementById('branch-list');
const alertMessage = document.getElementById('alert-message');

// Form fields
const branchName = document.getElementById('branch-name');
const branchAddress = document.getElementById('branch-address');
const branchPhone = document.getElementById('branch-phone');
const branchManager = document.getElementById('branch-manager');

// State
let currentEditingId = null;
let unsubscribeBranches = null;

// Initialize the app
function initApp() {
  setupEventListeners();
  loadBranches();
  setupConnectionMonitoring();
}

// Event Listeners
function setupEventListeners() {
  branchForm.addEventListener('submit', handleFormSubmit);
  cancelBtn.addEventListener('click', cancelEdit);
}

// Form Submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  const branchData = {
    name: branchName.value.trim(),
    address: branchAddress.value.trim(),
    phone: branchPhone.value.trim(),
    manager: branchManager.value.trim() || null,
    updatedAt: serverTimestamp()
  };
  
  try {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    if (currentEditingId) {
      // Update existing branch
      await updateDoc(doc(db, 'branches', currentEditingId), branchData);
      showAlert('Branch updated successfully!', 'success');
    } else {
      // Add new branch
      branchData.createdAt = serverTimestamp();
      await addDoc(collection(db, 'branches'), branchData);
      showAlert('Branch added successfully!', 'success');
    }
    
    resetForm();
  } catch (error) {
    console.error('Error saving branch: ', error);
    showAlert(`Error: ${error.message}`, 'danger');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Branch';
  }
}

// Form Validation
function validateForm() {
  if (!branchName.value.trim()) {
    showAlert('Branch name is required', 'danger');
    return false;
  }
  
  if (!branchAddress.value.trim()) {
    showAlert('Address is required', 'danger');
    return false;
  }
  
  if (!branchPhone.value.trim()) {
    showAlert('Phone number is required', 'danger');
    return false;
  }
  
  return true;
}

// Reset Form
function resetForm() {
  branchForm.reset();
  currentEditingId = null;
  cancelBtn.style.display = 'none';
  saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Branch';
}

// Cancel Edit
function cancelEdit() {
  resetForm();
}

// Load Branches
function loadBranches() {
  const q = query(collection(db, 'branches'), orderBy('createdAt', 'desc'));
  
  unsubscribeBranches = onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      branchList.innerHTML = '<p>No branches found. Add your first branch!</p>';
      return;
    }
    
    branchList.innerHTML = '';
    snapshot.forEach((doc) => {
      renderBranch(doc.id, doc.data());
    });
  }, (error) => {
    console.error('Error loading branches: ', error);
    branchList.innerHTML = `<div class="alert alert-danger">
      <i class="fas fa-exclamation-triangle"></i> Error loading branches: ${error.message}
    </div>`;
  });
}

// Render Branch
function renderBranch(id, branch) {
  const branchElement = document.createElement('div');
  branchElement.className = 'branch-item';
  branchElement.innerHTML = `
    <div class="branch-header">
      <div class="branch-name">${branch.name}</div>
      <div class="branch-date">${formatDate(branch.updatedAt || branch.createdAt)}</div>
    </div>
    <div class="branch-address">${branch.address}</div>
    <div class="branch-phone"><i class="fas fa-phone"></i> ${branch.phone}</div>
    ${branch.manager ? `<div class="branch-manager"><i class="fas fa-user-tie"></i> ${branch.manager}</div>` : ''}
    <div class="branch-actions">
      <button onclick="editBranch('${id}')" class="btn-secondary">
        <i class="fas fa-edit"></i> Edit
      </button>
      <button onclick="deleteBranch('${id}')" class="btn-danger">
        <i class="fas fa-trash-alt"></i> Delete
      </button>
    </div>
  `;
  
  branchList.appendChild(branchElement);
}

// Format Date
function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Edit Branch
window.editBranch = async (id) => {
  try {
    const docRef = doc(db, 'branches', id);
    const docSnap = await getDocs(docRef);
    
    if (docSnap.exists()) {
      const branch = docSnap.data();
      branchName.value = branch.name;
      branchAddress.value = branch.address;
      branchPhone.value = branch.phone;
      branchManager.value = branch.manager || '';
      
      currentEditingId = id;
      cancelBtn.style.display = 'inline-block';
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Branch';
      
      // Scroll to form
      branchForm.scrollIntoView({ behavior: 'smooth' });
    }
  } catch (error) {
    console.error('Error editing branch: ', error);
    showAlert(`Error: ${error.message}`, 'danger');
  }
};

// Delete Branch
window.deleteBranch = async (id) => {
  if (confirm('Are you sure you want to delete this branch?')) {
    try {
      await deleteDoc(doc(db, 'branches', id));
      showAlert('Branch deleted successfully!', 'success');
      
      // If deleting the currently edited branch, reset form
      if (currentEditingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error('Error deleting branch: ', error);
      showAlert(`Error: ${error.message}`, 'danger');
    }
  }
};

// Show Alert
function showAlert(message, type) {
  alertMessage.innerHTML = `
    <div class="alert alert-${type}">
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i> ${message}
    </div>
  `;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    alertMessage.innerHTML = '';
  }, 5000);
}

// Connection Monitoring
function setupConnectionMonitoring() {
  onSnapshot(doc(db, '.info/connected'), (doc) => {
    if (doc.data().connected) {
      connectionStatus.innerHTML = '<i class="fas fa-wifi"></i> Online (Connected to database)';
      connectionStatus.className = 'status online';
    } else {
      connectionStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Offline (Changes will sync when online)';
      connectionStatus.className = 'status offline';
    }
  });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Clean up when leaving the page
window.addEventListener('beforeunload', () => {
  if (unsubscribeBranches) {
    unsubscribeBranches();
  }
});
