// Initialize Firebase with your config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
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
