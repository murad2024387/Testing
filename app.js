// Initialize Firebase with your config
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

// DOM elements
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesDiv = document.getElementById('messages');

// Send message to Firestore
sendButton.addEventListener('click', async () => {
  const messageText = messageInput.value.trim();
  if (messageText) {
    try {
      await db.collection('messages').add({
        text: messageText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      messageInput.value = '';
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  }
});

// Real-time listener for messages
db.collection('messages')
  .orderBy('timestamp')
  .onSnapshot((snapshot) => {
    messagesDiv.innerHTML = '';
    snapshot.forEach(doc => {
      const message = doc.data();
      const messageElement = document.createElement('div');
      messageElement.className = 'message';
      messageElement.textContent = message.text;
      messagesDiv.appendChild(messageElement);
    });
    
    // Auto-scroll to bottom
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });

// Handle Enter key press
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendButton.click();
  }
});
