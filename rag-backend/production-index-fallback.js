import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { getProfessorsFromFirestore, searchProfessorsInFirestore } from './firestore-integration.js';

// Load environment variables
dotenv.config({ path: './production.env' });

const app = express();
const PORT = process.env.PORT || 3003;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration - Allow all localhost ports
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all localhost ports
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }
    
    // Allow specific origins from environment
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3001', 
      'http://localhost:3004',
      'http://localhost:3000',
      'http://localhost:3002',
      'http://localhost:5173',
      'http://localhost:4173'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Always allow localhost for development
    if (origin.includes('localhost')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Custom CORS middleware for explicit headers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin.includes('localhost')) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Professor data will be loaded from Firestore

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Gemini-powered smart matching (without ChromaDB)
async function generateGeminiMatches(query) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Create a comprehensive prompt with all professor data
    const professorsInfo = professorsData.map(prof => `
      Professor: ${prof.name}
      Title: ${prof.title}
      University: ${prof.university}
      Research Area: ${prof.researchArea}
      Bio: ${prof.bio}
      Keywords: ${prof.keywords.join(', ')}
    `).join('\n\n');
    
    const prompt = `
      You are an AI assistant helping match academic researchers. 
      
      Student Query: "${query}"
      
      Available Professors:
      ${professorsInfo}
      
      Analyze the student's research interests and find the top 3 most relevant professors. For each match, provide:
      1. A detailed justification (2-3 sentences) explaining why this professor would be a good match
      2. A similarity score between 0.0 and 1.0 based on research alignment
      3. Focus on specific research areas, expertise, and potential collaboration opportunities
      
      Return your response as a JSON array with this exact format:
      [
        {
          "id": "professor_id",
          "name": "Professor Name",
          "title": "Professor Title",
          "university": "University Name",
          "researchArea": "Research Area",
          "justification": "Detailed explanation here",
          "similarityScore": 0.85
        }
      ]
      
      Only return the JSON array, no other text.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response to extract JSON from markdown if present
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Parse JSON response
    const matches = JSON.parse(jsonText);
    
    // Ensure we have the required fields
    return matches.map(match => ({
      id: match.id || `prof_${Math.random().toString(36).substr(2, 9)}`,
      name: match.name,
      title: match.title,
      university: match.university,
      researchArea: match.researchArea,
      justification: match.justification,
      similarityScore: parseFloat(match.similarityScore) || 0.7
    }));
    
  } catch (error) {
    console.error('Error in Gemini response generation:', error);
    
    // Fallback to simple matching if Gemini fails
    const fallbackMatches = professorsData.slice(0, 3).map(prof => ({
      id: prof.id,
      name: prof.name,
      title: prof.title,
      university: prof.university,
      researchArea: prof.researchArea,
      justification: `Dr. ${prof.name.split(' ')[1]} is a strong match based on their expertise in ${prof.researchArea}. Their research at ${prof.university} demonstrates deep knowledge in areas that align with your academic interests.`,
      similarityScore: 0.7
    }));
    
    return fallbackMatches;
  }
}

// Generate Gemini matches using Firestore data
async function generateGeminiMatchesWithFirestore(query, professors) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Create context from Firestore professors
    const professorContext = professors.map(prof => ({
      name: prof.name,
      title: prof.title,
      university: prof.university,
      researchArea: prof.researchArea,
      bio: prof.bio,
      keywords: prof.keywords
    }));
    
    const prompt = `You are an AI academic matchmaker. Based on the student's research interest query, find the most relevant professors from the database.

Student Query: "${query}"

Available Professors:
${JSON.stringify(professorContext, null, 2)}

Return exactly 3 best matches as a JSON array with this structure:
[
  {
    "id": "professor_id",
    "name": "Professor Name",
    "title": "Professor Title",
    "university": "University Name",
    "researchArea": "Research Area",
    "justification": "Why this professor is a good match for the student's interests",
    "similarityScore": 0.95
  }
]

Focus on research area alignment, university reputation, and potential collaboration opportunities.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up the response (remove markdown formatting if present)
    let cleanText = text;
    if (cleanText.includes('```json')) {
      cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    if (cleanText.includes('```')) {
      cleanText = cleanText.replace(/```\n?/g, '');
    }
    
    // Try to extract JSON from the response
    let jsonText = cleanText.trim();
    
    // Look for JSON array in the response
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    
    try {
      const matches = JSON.parse(jsonText);
      return matches;
    } catch (parseError) {
      console.error('JSON parse error, using fallback matching:', parseError);
      // Fallback to simple keyword matching
      const queryLower = query.toLowerCase();
      const fallbackMatches = professors
        .filter(prof => {
          const searchText = [
            prof.name,
            prof.researchArea,
            prof.university,
            prof.title,
            prof.bio,
            ...(prof.keywords || [])
          ].join(' ').toLowerCase();
          return searchText.includes(queryLower);
        })
        .slice(0, 3)
        .map(prof => ({
          id: prof.id,
          name: prof.name,
          title: prof.title,
          university: prof.university,
          researchArea: prof.researchArea,
          justification: `Matches your interest in ${query} based on research area and expertise.`,
          similarityScore: 0.8
        }));
      
      return fallbackMatches;
    }
    
  } catch (error) {
    console.error('Error in Gemini response generation:', error);
    
    // Fallback to simple keyword matching
    const queryLower = query.toLowerCase();
    const fallbackMatches = professors
      .filter(prof => {
        const searchText = [
          prof.name,
          prof.researchArea,
          prof.university,
          prof.title,
          prof.bio,
          ...(prof.keywords || [])
        ].join(' ').toLowerCase();
        return searchText.includes(queryLower);
      })
      .slice(0, 3)
      .map(prof => ({
        id: prof.id,
        name: prof.name,
        title: prof.title,
        university: prof.university,
        researchArea: prof.researchArea,
        justification: `Matches your interest in ${query} based on research area and expertise.`,
        similarityScore: 0.8
      }));
    
    return fallbackMatches;
  }
}

// Production smart matching endpoint (with Firestore)
app.post('/smart-match', authenticateToken, async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || query.trim().length < 3) {
      return res.status(400).json({ 
        error: 'Query must be at least 3 characters long' 
      });
    }
    
    console.log(`🔍 Processing production smart match query: "${query}"`);
    
    // Get professors from Firestore
    const professors = await getProfessorsFromFirestore();
    
    if (professors.length === 0) {
      console.log('⚠️ No professors found in Firestore');
      return res.json([]);
    }
    
    // Generate smart matches using Gemini with Firestore data
    const matches = await generateGeminiMatchesWithFirestore(query, professors);
    
    console.log(`✅ Generated ${matches.length} smart matches with Gemini and Firestore`);
    
    res.json(matches);
    
  } catch (error) {
    console.error('❌ Error in production smart matching:', error);
    res.status(500).json({ 
      error: 'Internal server error during smart matching',
      details: error.message 
    });
  }
});

// Authentication endpoints
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // In production, validate against database
    // For demo, accept any credentials
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { email, userId: 'demo-user' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token,
      user: { email, userId: 'demo-user' },
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Academic Matchmaker RAG Backend',
    version: '1.0.0',
    endpoints: {
      'POST /auth/login': 'Authentication endpoint',
      'POST /smart-match': 'AI-powered smart matching (requires authentication)',
      'GET /health': 'Health check endpoint'
    },
    status: 'running'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Academic RAG Smart Matching - Production (Fallback)',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '2.0.0',
    features: ['Gemini AI', 'JWT Auth', 'Rate Limiting', 'Security Headers']
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Production RAG Backend (Fallback) running on port ${PORT}`);
  console.log(`📡 Smart matching endpoint: http://localhost:${PORT}/smart-match`);
  console.log(`🔐 Authentication endpoint: http://localhost:${PORT}/auth/login`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Gemini API: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`📊 Using Firestore for professor data`);
});

export default app;
