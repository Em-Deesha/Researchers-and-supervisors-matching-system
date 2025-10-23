// Test script to check what's in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Firebase configuration (same as frontend)
const firebaseConfig = {
  apiKey: "AIzaSyBXdC23TpcXdS2FCrwejDHkmbcQafmBq50",
  authDomain: "academic-matchmaker-prod.firebaseapp.com",
  projectId: "academic-matchmaker-prod",
  storageBucket: "academic-matchmaker-prod.firebasestorage.app",
  messagingSenderId: "967137857941",
  appId: "1:967137857941:web:d27ed1253edb32bd2ee69c",
  measurementId: "G-SPZGHFKQT3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirestore() {
  try {
    console.log('🔍 Testing Firestore connection...');
    
    // Try different collection paths
    const possiblePaths = [
      'artifacts/academic-match-production/public/data/users',
      'artifacts/academic-matchmaker-prod/public/data/users',
      'users',
      'artifacts/academic-match-production/users'
    ];
    
    for (const path of possiblePaths) {
      try {
        console.log(`\n📂 Checking path: ${path}`);
        const collectionRef = collection(db, path);
        const snapshot = await getDocs(collectionRef);
        
        console.log(`📊 Found ${snapshot.docs.length} documents in ${path}`);
        
        if (snapshot.docs.length > 0) {
          console.log('📋 Documents:');
          snapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`  ${index + 1}. ID: ${doc.id}`);
            console.log(`     Name: ${data.name || 'N/A'}`);
            console.log(`     UserType: ${data.userType || 'N/A'}`);
            console.log(`     University: ${data.university || 'N/A'}`);
            console.log(`     Research Area: ${data.researchArea || 'N/A'}`);
            console.log('     ---');
          });
        }
        
      } catch (pathError) {
        console.log(`❌ Path ${path} error:`, pathError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing Firestore:', error);
  }
}

// Run the test
testFirestore().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
