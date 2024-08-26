// config/firebase.js
const admin = require('firebase-admin');
const serviceAccount = require('../firebase-adminsdk.json'); // Path to your service account key file

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'blog-468a1.appspot.com' // Replace with your Firebase Storage Bucket URL
});

// Export the initialized app and storage bucket
const bucket = admin.storage().bucket();

module.exports = { bucket };
