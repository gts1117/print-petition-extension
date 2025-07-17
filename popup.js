// popup.js
// This script contains all the logic for the extension popup.

// --- IMPORTANT: FIREBASE CONFIGURATION ---
// Replace the placeholder values below with your actual Firebase project configuration.
const firebaseConfig = {
    apiKey: "AIzaSyA3BaMo5wUDAnN-R24J1cBMQwO7kolXHnY",
    authDomain: "notification-receiver-g1.firebaseapp.com",
    projectId: "notification-receiver-g1",
    storageBucket: "notification-receiver-g1.firebasestorage.app",
    messagingSenderId: "442112140332",
    appId: "1:442112140332:web:2c3ae34d6cbf23df191d89"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- SCRIPT LOGIC ---

// Get references to the HTML elements
const fileNameInput = document.getElementById('fileName');
const sendBtn = document.getElementById('sendBtn');
const statusDiv = document.getElementById('status');

// This function runs when the popup is opened.
// It gets the active tab's info and pre-fills the input field.
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

  // Get the current active tab to retrieve its URL and title
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) {
      statusDiv.textContent = 'Error: No active tab found.';
      sendBtn.disabled = false;
      return;
    }

    // Ask the content script to find the best image on the page
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: findBestImage,
    }, (injectionResults) => {
      const imageUrl = injectionResults[0].result;

      // Prepare the data to be sent to Firestore
      const notificationData = {
        source: "Paige's Print Petitions",
        fileName: fileNameInput.value,
        url: tab.url,
        imageUrl: imageUrl || 'No image found', // Include the image URL
        requestedBy: "Paige (via Chrome Extension)",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };

      // --- IMPORTANT: FIRESTORE PATH ---
      // Make sure this path matches the one your receiver app is listening to.
      // You will need to get YOUR User ID from the receiver app and paste it here.
      const userId = "qK1rjjDUx4TYY4kdLf4B0cbHMNl1";
      const collectionPath = `/artifacts/notification-receiver/users/${userId}/notifications`;

      // Add the new notification document to Firestore
      db.collection(collectionPath).add(notificationData)
        .then(() => {
          statusDiv.textContent = 'Petition Sent!';
          setTimeout(() => window.close(), 1000); // Close popup after 1 second
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
// It looks for a large image, often the main one, and avoids small icons.
function findBestImage() {
  let bestImage = null;
  let maxArea = 0;

  document.images.forEach(img => {
    const area = img.width * img.height;
    // Ignore small images and icons
    if (img.width > 200 && img.height > 200 && area > maxArea) {
      maxArea = area;
      bestImage = img.src;
    }
  });

  // As a fallback, check for the 'og:image' meta tag, which is common for social sharing
  if (!bestImage) {
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      bestImage = ogImage.content;
    }
  }

  return bestImage;
}