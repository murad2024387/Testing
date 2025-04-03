import { app, db } from './firebase.config.js';

// DOM elements
const appContainer = document.getElementById('app');
const statusIndicator = document.getElementById('connection-status');
const dataContainer = document.getElementById('data-container');

// Connection state monitoring
function setupConnectionMonitoring() {
  const connectionRef = firebase.database().ref('.info/connected');
  
  connectionRef.on('value', (snapshot) => {
    if (snapshot.val() === true) {
      statusIndicator.textContent = 'Online';
      statusIndicator.className = 'online';
      console.log('Connected to Firebase');
    } else {
      statusIndicator.textContent = 'Offline (using cached data)';
      statusIndicator.className = 'offline';
      console.log('Disconnected from Firebase');
    }
  });
}

// Load data from Firestore
async function loadData() {
  try {
    const querySnapshot = await db.collection('yourCollection').get();
    
    dataContainer.innerHTML = '';
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const itemElement = document.createElement('div');
      itemElement.className = 'data-item';
      itemElement.innerHTML = `
        <h3>${data.title || 'No title'}</h3>
        <p>${data.description || ''}</p>
      `;
      dataContainer.appendChild(itemElement);
    });
    
  } catch (error) {
    console.error("Error loading data: ", error);
    dataContainer.innerHTML = `<p class="error">Error loading data: ${error.message}</p>`;
  }
}

// Initialize Dexie.js for additional offline storage
function initDexieDB() {
  const db = new Dexie('MyOfflineDB');
  
  db.version(1).stores({
    cachedData: '++id, title, description, timestamp'
  });
  
  return db;
}

// Initialize the application
async function initApp() {
  try {
    setupConnectionMonitoring();
    const dexieDB = initDexieDB();
    
    // Load data immediately
    await loadData();
    
    // Set up real-time listener
    db.collection('yourCollection').onSnapshot((snapshot) => {
      loadData(); // Refresh when data changes
    }, (error) => {
      console.error("Snapshot error: ", error);
    });
    
  } catch (error) {
    console.error("Initialization error: ", error);
    appContainer.innerHTML = `<div class="error">Application initialization failed: ${error.message}</div>`;
  }
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
