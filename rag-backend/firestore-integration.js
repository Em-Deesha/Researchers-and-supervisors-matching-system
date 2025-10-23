// Firestore Integration for Professor Data
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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

// Function to get professors from Firestore
async function getProfessorsFromFirestore() {
  try {
    console.log('🔍 Fetching professors from Firestore...');
    
    // Try different collection paths - prioritize the users collection where professors are stored
    const possiblePaths = [
      'artifacts/academic-match-production/public/data/users', // Main users collection
      'artifacts/academic-matchmaker-prod/public/data/users', // Alternative path
      'artifacts/academic-matchmaker-prod/public/data/professors', // Separate professors collection
      'professors',
      'artifacts/academic-matchmaker-prod/professors'
    ];
    
    let professors = [];
    
    for (const path of possiblePaths) {
      try {
        const collectionRef = collection(db, path);
        const snapshot = await getDocs(collectionRef);
        
        professors = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          
          // If this is the users collection, filter for professors only
          if (path.includes('users')) {
            if (data.userType === 'professor') {
              professors.push({
                id: doc.id,
                ...data,
                // Ensure keywords is an array
                keywords: Array.isArray(data.keywords) ? data.keywords : []
              });
            }
          } else {
            // If this is a dedicated professors collection, include all
            professors.push({
              id: doc.id,
              ...data,
              // Ensure keywords is an array
              keywords: Array.isArray(data.keywords) ? data.keywords : []
            });
          }
        });
        
        if (professors.length > 0) {
          console.log(`📊 Loaded ${professors.length} professors from Firestore path: ${path}`);
          console.log('🔍 Professor data:', professors.map(p => ({ name: p.name, userType: p.userType, researchArea: p.researchArea })));
          return professors;
        }
      } catch (pathError) {
        console.log(`⚠️ Path ${path} not accessible:`, pathError.message);
        continue;
      }
    }
    
    console.log('⚠️ No professors found in any Firestore path');
    
    // No fallback data - return empty array to force using real data only
    console.log('📚 No fallback data - using real Firestore data only');
    return [];
    
  } catch (error) {
    console.error('❌ Error fetching professors from Firestore:', error);
    return [];
  }
}

// Function to search professors in Firestore
async function searchProfessorsInFirestore(query) {
  try {
    const professors = await getProfessorsFromFirestore();
    
    // Simple keyword matching (can be enhanced with more sophisticated search)
    const queryLower = query.toLowerCase();
    const matchingProfessors = professors.filter(professor => {
      const searchText = [
        professor.name,
        professor.researchArea,
        professor.university,
        professor.title,
        professor.bio,
        ...(professor.keywords || [])
      ].join(' ').toLowerCase();
      
      return searchText.includes(queryLower);
    });
    
    return matchingProfessors;
  } catch (error) {
    console.error('❌ Error searching professors in Firestore:', error);
    return [];
  }
}

// Function to get students from Firestore
async function getStudentsFromFirestore() {
  try {
    console.log('🔍 Fetching students from Firestore...');
    
    // Try different collection paths - prioritize the users collection where students are stored
    const possiblePaths = [
      'artifacts/academic-match-production/public/data/users', // Main users collection
      'artifacts/academic-matchmaker-prod/public/data/users', // Alternative path
    ];
    
    let students = [];
    
    for (const path of possiblePaths) {
      try {
        const collectionRef = collection(db, path);
        const snapshot = await getDocs(collectionRef);
        
        students = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          
          // Filter for students only
          if (data.userType === 'student') {
            students.push({
              id: doc.id,
              ...data,
              // Ensure keywords is an array
              keywords: Array.isArray(data.keywords) ? data.keywords : []
            });
          }
        });
        
        if (students.length > 0) {
          console.log(`📊 Loaded ${students.length} students from Firestore path: ${path}`);
          console.log('🔍 Student data:', students.map(s => ({ name: s.name, userType: s.userType, researchArea: s.researchArea })));
          return students;
        }
      } catch (pathError) {
        console.log(`⚠️ Path ${path} not accessible:`, pathError.message);
        continue;
      }
    }
    
    console.log('⚠️ No students found in any Firestore path');
    
    // No fallback data - return empty array to force using real data only
    console.log('📚 No fallback data - using real Firestore data only');
    return [];
    
  } catch (error) {
    console.error('❌ Error fetching students from Firestore:', error);
    return [];
  }
}

export {
  getProfessorsFromFirestore,
  searchProfessorsInFirestore,
  getStudentsFromFirestore
};
