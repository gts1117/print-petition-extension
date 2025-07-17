// popup.js
// This script contains all the logic for the extension popup.

// --- IMPORTANT: FIREBASE CONFIGURATION ---
// Make sure this is filled out with your actual Firebase project configuration.
const firebaseConfig = {
    apiKey: "AIzaSyA3BaMo5wUDAnN-R24J1cBMQwO7kolXHnY",
    authDomain: "notification-receiver-g1.firebaseapp.com",
    projectId: "notification-receiver-g1",
    storageBucket: "notification-receiver-g1.firebasestorage.app",
    messagingSenderId: "442112140332",
    appId: "1:442112140332:web:2c3ae34d6cbf23df191d89"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// --- SCRIPT LOGIC ---

// Get references to the HTML elements
const fileNameInput = document.getElementById('fileName');
const notesInput = document.getElementById('notes'); // New element for notes
const sendBtn = document.getElementById('sendBtn');
const statusDiv = document.getElementById('status');

// This function runs when the popup is opened.
document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].title) {
      fileNameInput.value = tabs[0].title;
    }
  });
});

// This function runs when the "Send" button is clicked.
sendBtn.addEventListener('click', () => {
  statusDiv.textContent = 'Sending...';
  sendBtn.disabled = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) {
      statusDiv.textContent = 'Error: No active tab found.';
      sendBtn.disabled = false;
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: findBestImage,
    }, (injectionResults) => {
      // Handle potential errors from script injection
      const imageUrl = (injectionResults && injectionResults[0]) ? injectionResults[0].result : null;

      // Prepare the data to be sent to Firestore
      const notificationData = {
        source: "Paige's Print Petitions",
        fileName: fileNameInput.value,
        notes: notesInput.value, // Add the notes from the input
        url: tab.url,
        imageUrl: imageUrl || 'No image found',
        requestedBy: "Paige (via Chrome Extension)",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };

      // --- IMPORTANT: FIRESTORE PATH ---
      // Make sure this is filled out with your User ID from the receiver app.
      const userId = "qK1rjjDUx4TYY4kdLf4B0cbHMNl1";
      const collectionPath = `/artifacts/notification-receiver/users/${userId}/notifications`;

      db.collection(collectionPath).add(notificationData)
        .then(() => {
          statusDiv.textContent = 'Petition Sent!';
          setTimeout(() => window.close(), 1000);
        })
        .catch((error) => {
          console.error("Error sending notification: ", error);
          statusDiv.textContent = 'Error! Check console.';
          sendBtn.disabled = false;
        });
    });
  });
});

// This function is injected into the webpage to find a suitable image.
function findBestImage() {
  let bestImage = null;
  let maxArea = 0;

  document.images.forEach(img => {
    const area = img.width * img.height;
    if (img.width > 200 && img.height > 200 && area > maxArea) {
      maxArea = area;
      bestImage = img.src;
    }
  });

  if (!bestImage) {
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      bestImage = ogImage.content;
    }
  }

  return bestImage;
}