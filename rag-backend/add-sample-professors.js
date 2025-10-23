// Script to add sample professors to Firestore for testing
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

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

// Sample professors data
const sampleProfessors = [
  {
    name: 'Dr. Sarah Chen',
    title: 'Professor of Computer Science',
    university: 'Stanford University',
    department: 'Computer Science',
    researchArea: 'Machine Learning and AI',
    bio: 'Leading researcher in machine learning with focus on deep learning applications and neural networks. Specializes in computer vision and natural language processing.',
    keywords: ['machine learning', 'deep learning', 'artificial intelligence', 'neural networks', 'computer vision', 'nlp'],
    email: 'sarah.chen@stanford.edu',
    website: 'https://stanford.edu/~sarahchen',
    userType: 'professor',
    yearsExperience: 15,
    isVerified: true,
    availability: 'Available for collaborations',
    timezone: 'UTC-8',
    createdAt: serverTimestamp(),
    addedBy: 'system'
  },
  {
    name: 'Dr. Michael Rodriguez',
    title: 'Professor of Biology',
    university: 'MIT',
    department: 'Biology',
    researchArea: 'Cancer Research and Genomics',
    bio: 'Expert in cancer genomics and personalized medicine. Leading research in precision oncology and biomarker discovery.',
    keywords: ['cancer', 'genomics', 'personalized medicine', 'oncology', 'genetics', 'biomarkers'],
    email: 'mrodriguez@mit.edu',
    website: 'https://biology.mit.edu/rodriguez',
    userType: 'professor',
    yearsExperience: 12,
    isVerified: true,
    availability: 'Available for collaborations',
    timezone: 'UTC-5',
    createdAt: serverTimestamp(),
    addedBy: 'system'
  },
  {
    name: 'Dr. Emily Watson',
    title: 'Professor of Physics',
    university: 'Caltech',
    department: 'Physics',
    researchArea: 'Quantum Computing and Quantum Mechanics',
    bio: 'Pioneer in quantum computing and quantum information theory. Leading research in quantum algorithms and quantum machine learning.',
    keywords: ['quantum computing', 'quantum mechanics', 'quantum information', 'physics', 'quantum algorithms'],
    email: 'ewatson@caltech.edu',
    website: 'https://physics.caltech.edu/watson',
    userType: 'professor',
    yearsExperience: 18,
    isVerified: true,
    availability: 'Available for collaborations',
    timezone: 'UTC-8',
    createdAt: serverTimestamp(),
    addedBy: 'system'
  },
  {
    name: 'Dr. James Kim',
    title: 'Professor of Chemistry',
    university: 'Harvard University',
    department: 'Chemistry',
    researchArea: 'Drug Discovery and Medicinal Chemistry',
    bio: 'Leading researcher in drug discovery and pharmaceutical chemistry. Specializes in small molecule therapeutics and drug design.',
    keywords: ['drug discovery', 'medicinal chemistry', 'pharmaceuticals', 'chemistry', 'therapeutics'],
    email: 'jkim@harvard.edu',
    website: 'https://chemistry.harvard.edu/kim',
    userType: 'professor',
    yearsExperience: 20,
    isVerified: true,
    availability: 'Available for collaborations',
    timezone: 'UTC-5',
    createdAt: serverTimestamp(),
    addedBy: 'system'
  },
  {
    name: 'Dr. Lisa Thompson',
    title: 'Professor of Data Science',
    university: 'UC Berkeley',
    department: 'Statistics',
    researchArea: 'Data Science and Statistical Learning',
    bio: 'Expert in statistical learning and big data analytics. Leading research in machine learning algorithms and data mining.',
    keywords: ['data science', 'statistics', 'big data', 'analytics', 'machine learning', 'data mining'],
    email: 'lthompson@berkeley.edu',
    website: 'https://statistics.berkeley.edu/thompson',
    userType: 'professor',
    yearsExperience: 14,
    isVerified: true,
    availability: 'Available for collaborations',
    timezone: 'UTC-8',
    createdAt: serverTimestamp(),
    addedBy: 'system'
  }
];

async function addSampleProfessors() {
  try {
    console.log('🚀 Adding sample professors to Firestore...');
    
    // Try different collection paths
    const possiblePaths = [
      'artifacts/academic-match-production/public/data/users', // Main users collection
      'artifacts/academic-matchmaker-prod/public/data/users', // Alternative path
    ];
    
    for (const path of possiblePaths) {
      try {
        console.log(`📝 Trying to add professors to: ${path}`);
        const usersCollection = collection(db, path);
        
        for (const professor of sampleProfessors) {
          await addDoc(usersCollection, professor);
          console.log(`✅ Added professor: ${professor.name}`);
        }
        
        console.log(`🎉 Successfully added ${sampleProfessors.length} professors to ${path}`);
        return;
        
      } catch (pathError) {
        console.log(`⚠️ Path ${path} not accessible:`, pathError.message);
        continue;
      }
    }
    
    console.log('❌ Could not add professors to any Firestore path');
    
  } catch (error) {
    console.error('❌ Error adding sample professors:', error);
  }
}

// Run the script
addSampleProfessors().then(() => {
  console.log('✅ Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
