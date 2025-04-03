// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBEtLS0v4FJpHy11OsFwAJMUTo4W-ZvxVs",
  authDomain: "muradapps-dbe17.firebaseapp.com",
  projectId: "muradapps-dbe17",
  storageBucket: "muradapps-dbe17.firebasestorage.app",
  messagingSenderId: "117855279460",
  appId: "1:117855279460:web:3403584abd902e5d628271"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// DOM Elements
const branchForm = document.getElementById('branchForm');
const branchesContainer = document.getElementById('branchesContainer');
const searchBranch = document.getElementById('searchBranch');
const signOutButton = document.getElementById('signOutButton');
let map;
let currentBranchId = null;

// Initialize Google Maps
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 0, lng: 0 },
    zoom: 2,
  });
}

// Add a new branch
branchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const branch = {
    name: document.getElementById('branchName').value,
    location: document.getElementById('branchLocation').value,
    manager: document.getElementById('branchManager').value,
    status: document.getElementById('branchStatus').value,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection('branches').add(branch);
    branchForm.reset();
  } catch (error) {
    console.error("Error adding branch: ", error);
    alert("Failed to add branch: " + error.message);
  }
});

// Display branches
function renderBranches(branches) {
  branchesContainer.innerHTML = '';
  
  branches.forEach(branch => {
    const branchCard = document.createElement('div');
    branchCard.className = `col-md-6 branch-card ${branch.status === 'active' ? 'status-active' : 'status-inactive'}`;
    branchCard.innerHTML = `
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">${branch.name}</h5>
          <p class="card-text"><strong>Location:</strong> ${branch.location}</p>
          <p class="card-text"><strong>Manager:</strong> ${branch.manager || 'Not assigned'}</p>
          <span class="badge ${branch.status === 'active' ? 'bg-success' : 'bg-danger'}">
            ${branch.status.toUpperCase()}
          </span>
          <button class="btn btn-sm btn-outline-primary float-end view-branch" data-id="${branch.id}">
            View Details
          </button>
        </div>
      </div>
    `;
    branchesContainer.appendChild(branchCard);
  });

  // Add event listeners to view buttons
  document.querySelectorAll('.view-branch').forEach(button => {
    button.addEventListener('click', () => viewBranchDetails(button.dataset.id));
  });
}

// View branch details
async function viewBranchDetails(branchId) {
  currentBranchId = branchId;
  const branchDoc = await db.collection('branches').doc(branchId).get();
  const branch = branchDoc.data();
  
  document.getElementById('modalBody').innerHTML = `
    <p><strong>Branch Name:</strong> ${branch.name}</p>
    <p><strong>Location:</strong> ${branch.location}</p>
    <p><strong>Manager:</strong> ${branch.manager || 'Not assigned'}</p>
    <p><strong>Status:</strong> 
      <span class="badge ${branch.status === 'active' ? 'bg-success' : 'bg-danger'}">
        ${branch.status.toUpperCase()}
      </span>
    </p>
    <div class="mb-3">
      <label for="editManager" class="form-label">Update Manager</label>
      <input type="text" class="form-control" id="editManager" value="${branch.manager || ''}">
    </div>
    <div class="mb-3">
      <label for="editStatus" class="form-label">Update Status</label>
      <select class="form-select" id="editStatus">
        <option value="active" ${branch.status === 'active' ? 'selected' : ''}>Active</option>
        <option value="inactive" ${branch.status === 'inactive' ? 'selected' : ''}>Inactive</option>
      </select>
    </div>
  `;

  // Initialize modal
  const modal = new bootstrap.Modal(document.getElementById('branchModal'));
  modal.show();
}

// Update branch
document.getElementById('updateBranch').addEventListener('click', async () => {
  try {
    await db.collection('branches').doc(currentBranchId).update({
      manager: document.getElementById('editManager').value,
      status: document.getElementById('editStatus').value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    bootstrap.Modal.getInstance(document.getElementById('branchModal')).hide();
  } catch (error) {
    console.error("Error updating branch: ", error);
    alert("Failed to update branch: " + error.message);
  }
});

// Delete branch
document.getElementById('deleteBranch').addEventListener('click', async () => {
  if (confirm("Are you sure you want to delete this branch?")) {
    try {
      await db.collection('branches').doc(currentBranchId).delete();
      bootstrap.Modal.getInstance(document.getElementById('branchModal')).hide();
    } catch (error) {
      console.error("Error deleting branch: ", error);
      alert("Failed to delete branch: " + error.message);
    }
  }
});

// Search branches
searchBranch.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const branchCards = document.querySelectorAll('.branch-card');
  
  branchCards.forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(searchTerm) ? 'block' : 'none';
  });
});

// Real-time listener for branches
db.collection('branches').orderBy('createdAt').onSnapshot(snapshot => {
  const branches = [];
  snapshot.forEach(doc => {
    branches.push({
      id: doc.id,
      ...doc.data()
    });
  });
  renderBranches(branches);
  updateMapMarkers(branches);
});

// Update map markers
function updateMapMarkers(branches) {
  // Clear existing markers
  if (window.markers) {
    window.markers.forEach(marker => marker.setMap(null));
  }
  window.markers = [];

  // Add new markers
  branches.forEach(branch => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: branch.location }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const marker = new google.maps.Marker({
          map: map,
          position: results[0].geometry.location,
          title: branch.name
        });
        window.markers.push(marker);
      }
    });
  });
}

// Authentication
auth.onAuthStateChanged(user => {
  if (user) {
    signOutButton.classList.remove('d-none');
    initMap();
  } else {
    signOutButton.classList.add('d-none');
    window.location.href = 'login.html'; // Redirect to login if not authenticated
  }
});

signOutButton.addEventListener('click', () => {
  auth.signOut();
});

// Initialize the app
window.initMap = initMap;
