import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, onSnapshot, addDoc, serverTimestamp, where, arrayUnion, getDocs, orderBy, limit } from 'firebase/firestore';
import { User, GraduationCap, Globe, BookOpen, Send, Loader2, LogOut, CheckCheck, MessageSquare, Heart, Edit2, Clock, Search, Zap, XCircle, Bell, BellRing, Paperclip, Image, File } from 'lucide-react';

// --- Import Firebase Configuration ---
import { firebaseConfig, appId } from './firebase-config.js';

// --- Utility Functions ---

// Helper function to format Firestore Timestamp
const formatTimestamp = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return 'Just now';
  const date = timestamp.toDate();
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// --- Post Creator Component (Enhanced) ---
const PostCreator = ({ db, userId, userName, userTitle, onPostCreated }) => {
  const [postContent, setPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [postType, setPostType] = useState('text'); // 'text', 'image', 'document'
  
  if (!db || !userId) return null;

  const postsCollection = collection(db, `artifacts/${appId}/public/data/posts`);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (postContent.trim() === '' && selectedFiles.length === 0) return;

    setIsSubmitting(true);
    setMessage('');

    try {
      // Convert files to base64 for storage
      const fileData = await Promise.all(
        selectedFiles.map(async (file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          data: await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          })
        }))
      );

      await addDoc(postsCollection, {
        authorId: userId,
        authorName: userName || 'Anonymous Researcher',
        authorTitle: userTitle || 'Academic Member',
        content: postContent,
        files: fileData,
        postType: postType,
        timestamp: serverTimestamp(), 
        likes: 0,
        comments: [],
        isEdited: false,
      });
      
      setPostContent('');
      setSelectedFiles([]);
      setPostType('text');
      setMessage('Post published successfully!');
      onPostCreated();
    } catch (error) {
      console.error('Error adding post:', error);
      setMessage(`Error publishing post: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg mb-6 border border-gray-100">
      <h3 className="text-xl font-semibold text-indigo-700 mb-4 flex items-center">
        <BookOpen className="w-5 h-5 mr-2" /> Share Your Research
      </h3>
      <form onSubmit={handleSubmit}>
        {/* Post Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Post Type</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="postType"
                value="text"
                checked={postType === 'text'}
                onChange={(e) => setPostType(e.target.value)}
                className="mr-2"
              />
              Text Post
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="postType"
                value="image"
                checked={postType === 'image'}
                onChange={(e) => setPostType(e.target.value)}
                className="mr-2"
              />
              Image/Media
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="postType"
                value="document"
                checked={postType === 'document'}
                onChange={(e) => setPostType(e.target.value)}
                className="mr-2"
              />
              Document
            </label>
          </div>
        </div>

        {/* Content Textarea */}
        <textarea
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          rows="3"
          placeholder="What new discovery or collaboration opportunity are you working on today?"
          className="w-full rounded-lg border border-gray-300 p-3 mb-3 focus:border-indigo-500 focus:ring-indigo-500 transition duration-150"
          disabled={isSubmitting}
        />

        {/* File Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Attach Files</label>
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
            onChange={handleFileSelect}
            className="w-full p-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-indigo-500"
            disabled={isSubmitting}
          />
          
          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-gray-600">Selected files:</p>
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-sm text-gray-700">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <button
            type="submit"
            disabled={isSubmitting || (postContent.trim() === '' && selectedFiles.length === 0)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Send className="w-5 h-5 mr-2" />}
            Publish Post
          </button>
          {message && <p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}
        </div>
      </form>
    </div>
  );
};

// --- Posts Feed Component (Enhanced) ---
const PostsFeed = ({ db, isAuthReady, userId }) => {
  const [posts, setPosts] = useState([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [expandedComments, setExpandedComments] = useState({});
  const [newComments, setNewComments] = useState({});

  const fetchPosts = useCallback(() => {
    if (!db || !isAuthReady) return;
    
    setIsLoadingFeed(true);
    const postsCollectionRef = collection(db, `artifacts/${appId}/public/data/posts`);
    const postsQuery = query(postsCollectionRef);
    
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Client-side sorting by timestamp (descending)
      fetchedPosts.sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return b.timestamp.toMillis() - a.timestamp.toMillis();
      });
      
      setPosts(fetchedPosts);
      setIsLoadingFeed(false);
    }, (error) => {
      console.error("Error fetching posts:", error);
      setIsLoadingFeed(false);
    });

    return unsubscribe;
  }, [db, isAuthReady]);

  useEffect(() => {
    return fetchPosts();
  }, [fetchPosts]);

  const handleLike = async (postId, currentLikes) => {
    if (!db || !userId) return;
    
    try {
      const postRef = doc(db, `artifacts/${appId}/public/data/posts`, postId);
      await setDoc(postRef, {
        likes: currentLikes + 1,
        likedBy: arrayUnion(userId)
      }, { merge: true });
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = async (postId) => {
    if (!db || !userId || !newComments[postId]?.trim()) return;
    
    try {
      const postRef = doc(db, `artifacts/${appId}/public/data/posts`, postId);
      const newComment = {
        id: Date.now().toString(),
        authorId: userId,
        authorName: 'You', // This should be fetched from user profile
        text: newComments[postId],
        timestamp: serverTimestamp()
      };
      
      await setDoc(postRef, {
        comments: arrayUnion(newComment)
      }, { merge: true });
      
      setNewComments(prev => ({ ...prev, [postId]: '' }));
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  if (!isAuthReady) {
    return <p className="text-center p-8 text-gray-500">Awaiting authentication...</p>;
  }

  if (isLoadingFeed) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="animate-spin h-6 w-6 text-indigo-500 mr-2" />
        <p className="text-gray-600">Loading academic feed...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return <p className="text-center p-8 text-gray-500 bg-white rounded-xl shadow-lg">No posts yet. Be the first to share an update!</p>;
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <div key={post.id} className="bg-white p-5 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center mb-3 border-b pb-3">
            <User className="w-8 h-8 p-1 rounded-full bg-indigo-100 text-indigo-600 mr-3" />
            <div>
              <p className="font-bold text-gray-900">{post.authorName}</p>
              <p className="text-sm text-gray-500">{post.authorTitle}</p>
            </div>
            <div className="ml-auto text-xs text-gray-400 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {formatTimestamp(post.timestamp)}
            </div>
          </div>
          
          {/* Post Content */}
          <p className="text-gray-700 whitespace-pre-wrap mb-4">{post.content}</p>
          
          {/* File Attachments */}
          {post.files && post.files.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Attachments:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {post.files.map((file, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-gray-50">
                    {file.type.startsWith('image/') ? (
                      <div>
                        <img 
                          src={file.data} 
                          alt={file.name}
                          className="max-w-full h-48 object-cover rounded"
                        />
                        <p className="text-sm text-gray-600 mt-2">{file.name}</p>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-indigo-100 rounded flex items-center justify-center mr-3">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Post Type Badge */}
          {post.postType && post.postType !== 'text' && (
            <div className="mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {post.postType === 'image' ? '📷 Image Post' : '📄 Document Post'}
              </span>
            </div>
          )}
          
          {/* Like and Comment Buttons */}
          <div className="flex space-x-4 pt-3 border-t">
            <button 
              onClick={() => handleLike(post.id, post.likes || 0)}
              className="flex items-center text-indigo-600 hover:text-indigo-700 transition duration-150 text-sm font-medium"
            >
              <Heart className="w-4 h-4 mr-1" />
              Like ({post.likes || 0})
            </button>
            <button 
              onClick={() => toggleComments(post.id)}
              className="flex items-center text-gray-500 hover:text-gray-700 transition duration-150 text-sm font-medium"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              Comment ({post.comments?.length || 0})
            </button>
          </div>
          
          {/* Comments Section */}
          {expandedComments[post.id] && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Comments</h4>
              
              {/* Existing Comments */}
              {post.comments && post.comments.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {post.comments.map((comment, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center mb-1">
                        <span className="text-sm font-medium text-gray-900">{comment.authorName}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {comment.timestamp ? formatTimestamp(comment.timestamp) : 'Just now'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-4">No comments yet. Be the first to comment!</p>
              )}
              
              {/* Add Comment Form */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComments[post.id] || ''}
                  onChange={(e) => setNewComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                  className="flex-1 rounded-lg border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <button
                  onClick={() => handleComment(post.id)}
                  disabled={!newComments[post.id]?.trim()}
                  className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};


// --- Chat Window Component (Real Firestore) ---
const ChatWindow = ({ db, currentUserId, partner, onEndChat }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Helper to scroll to the bottom of the chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Find or Create Chat Document (Real Firestore)
  useEffect(() => {
    if (!db || !currentUserId || !partner.userId) return;

    setIsLoading(true);
    // Participants array is sorted alphabetically to create a canonical chat ID
    const participants = [currentUserId, partner.userId].sort();
    
    const chatsCollectionRef = collection(db, `artifacts/${appId}/public/data/chats`);
    
    // Query to find existing chat
    const chatQuery = query(chatsCollectionRef, where('participants', '==', participants));

    const unsubscribe = onSnapshot(chatQuery, async (snapshot) => {
      let currentChatId = null;
      if (snapshot.empty) {
        // Chat does not exist, create it
        const newChatDoc = await addDoc(chatsCollectionRef, {
          participants: participants,
          createdAt: serverTimestamp(),
        });
        currentChatId = newChatDoc.id;
      } else {
        // Chat exists
        currentChatId = snapshot.docs[0].id;
      }
      setChatId(currentChatId);
      setIsLoading(false);
    }, (error) => {
      console.error("Error finding/creating chat:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, currentUserId, partner.userId]);

  // 2. Listen for Messages (Real Firestore)
  useEffect(() => {
    if (!db || !chatId) return;

    const messagesCollectionRef = collection(db, `artifacts/${appId}/public/data/chats/${chatId}/messages`);
    const messagesQuery = query(messagesCollectionRef); 

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Client-side sorting by timestamp
      fetchedMessages.sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return a.timestamp.toMillis() - b.timestamp.toMillis();
      });

      setMessages(fetchedMessages);
      // Wait for messages to load, then scroll
      setTimeout(scrollToBottom, 100); 
    }, (error) => {
      console.error("Error fetching messages:", error);
    });

    return () => unsubscribe();
  }, [db, chatId]);

  // 3. Send Message Handler (Real Firestore)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !chatId) return;

    const messagesCollectionRef = collection(db, `artifacts/${appId}/public/data/chats/${chatId}/messages`);
    
    try {
      await addDoc(messagesCollectionRef, {
        senderId: currentUserId,
        text: newMessage,
        timestamp: serverTimestamp(),
      });
      
      // Send notification to professor if student is messaging
      if (currentUserId !== partner.userId) {
        const notificationsCollection = collection(db, `artifacts/${appId}/public/data/notifications`);
        await addDoc(notificationsCollection, {
          professorId: partner.userId,
          studentId: currentUserId,
          studentName: 'Student', // This should be fetched from user profile
          message: `New message: ${newMessage.substring(0, 50)}...`,
          read: false,
          timestamp: serverTimestamp(),
          chatId: chatId
        });
      }
      
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };


  if (isLoading || !chatId) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-100 rounded-xl">
        <Loader2 className="animate-spin h-6 w-6 text-indigo-500 mr-2" />
        <p className="text-gray-600">Setting up chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-2xl border border-gray-100">
      {/* Header */}
      <div className="p-4 border-b bg-indigo-50 rounded-t-xl flex items-center justify-between">
        <h3 className="font-bold text-lg text-indigo-700 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2" /> Chatting with {partner.name}
        </h3>
        <button onClick={onEndChat} className="text-red-500 hover:text-red-700 transition">
          <XCircle className="w-6 h-6" />
        </button>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs sm:max-w-md px-4 py-2 rounded-xl shadow-md text-sm ${
              msg.senderId === currentUserId 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-gray-200 text-gray-800 rounded-tl-none'
            }`}>
              <p>{msg.text}</p>
              <span className="text-xs opacity-70 mt-1 block">
                {msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || newMessage.trim() === ''}
            className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};


// --- Chat Interface Component ---
const ChatInterface = ({ db, userId, userName, userType }) => {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Load user's chats
  useEffect(() => {
    if (!db || !userId) return;

    console.log('🔍 Loading chats for user ID:', userId);
    const chatsCollection = collection(db, `artifacts/${appId}/public/data/chats`);
    const userChatsQuery = query(
      chatsCollection,
      where('participants', 'array-contains', userId)
    );

    const unsubscribe = onSnapshot(userChatsQuery, (snapshot) => {
      const userChats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('🔍 Loaded chats for user:', userId, userChats);
      setChats(userChats);
    }, (error) => {
      console.error('❌ Error loading chats:', error);
    });

    return () => unsubscribe();
  }, [db, userId]);

  // Load messages for active chat
  useEffect(() => {
    if (!db || !activeChat) {
      setMessages([]);
      return;
    }

    console.log('🔍 Loading messages for chat:', activeChat.id);
    const messagesCollection = collection(db, `artifacts/${appId}/public/data/chats/${activeChat.id}/messages`);
    const messagesQuery = query(messagesCollection, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const chatMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('🔍 Loaded messages for chat:', activeChat.id, chatMessages);
      console.log('🔍 Setting messages state with:', chatMessages.length, 'messages');
      console.log('🔍 Message details:', chatMessages.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        content: msg.content,
        timestamp: msg.timestamp
      })));
      console.log('🔍 Current user ID:', userId);
      console.log('🔍 Chat participants:', activeChat.participants);
      setMessages(chatMessages);
    }, (error) => {
      console.error('❌ Error loading messages:', error);
    });

    return () => unsubscribe();
  }, [db, activeChat]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    try {
      // Ensure content is not undefined or empty
      const messageContent = newMessage.trim() || '';
      if (!messageContent && selectedFiles.length === 0) {
        console.log('⚠️ Cannot send empty message');
        return;
      }

      const messageData = {
        senderId: userId,
        senderName: userName,
        content: messageContent,
        timestamp: serverTimestamp(),
        type: 'text',
        files: selectedFiles
      };

      if (activeChat) {
        console.log('🔍 Sending message to chat:', activeChat.id);
        console.log('🔍 Message data being sent:', messageData);
        console.log('🔍 Current user ID:', userId);
        console.log('🔍 Chat participants:', activeChat.participants);
        // Add message to existing chat
        const messagesCollection = collection(db, `artifacts/${appId}/public/data/chats/${activeChat.id}/messages`);
        const docRef = await addDoc(messagesCollection, messageData);
        console.log('✅ Message sent to chat:', activeChat.id, 'Message ID:', docRef.id);
        
        // Update chat with last message
        const chatRef = doc(db, `artifacts/${appId}/public/data/chats/${activeChat.id}`);
        await setDoc(chatRef, {
          lastMessage: newMessage,
          lastMessageTime: serverTimestamp(),
          lastMessageSender: userName
        }, { merge: true });
        console.log('✅ Chat updated with last message');
      } else {
        console.log('❌ No active chat selected');
      }

      setNewMessage('');
      setSelectedFiles([]);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      if (error.code === 'permission-denied') {
        console.error('🔒 Permission denied: Check Firestore security rules');
      } else if (error.code === 'unavailable') {
        console.error('🌐 Network error: Check internet connection');
      }
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex h-[600px]">
          {/* Chat List Sidebar */}
          <div className="w-1/3 border-r border-gray-200 bg-gray-50">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">My Chats</h3>
            </div>
            <div className="overflow-y-auto">
              {chats.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No chats yet</p>
                  <p className="text-sm">Start a conversation from the matchmaker!</p>
                </div>
              ) : (
                chats.map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => {
                      console.log('🔍 Chat selected:', chat.id, chat);
                      setActiveChat(chat);
                    }}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 ${
                      activeChat?.id === chat.id ? 'bg-indigo-50 border-indigo-200' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="ml-3 flex-1">
                        <h4 className="font-medium text-gray-900">
                          {chat.participants?.find(p => p !== userId) || 'Unknown User'}
                        </h4>
                        <p className="text-sm text-gray-500 truncate">
                          {chat.lastMessage || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 flex flex-col">
            {activeChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="font-medium text-gray-900">
                        {activeChat.participants?.find(p => p !== userId) || 'Unknown User'}
                      </h4>
                      <p className="text-sm text-gray-500">Online</p>
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                  <div className="space-y-4">
                    {console.log('🔍 Current messages state:', messages.length, messages)}
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No messages yet</p>
                        <p className="text-sm">Start the conversation!</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Debug: {messages.length} messages loaded</p>
                        {messages.map((message) => {
                        const isCurrentUser = message.senderId === userId;
                        console.log('🔍 Rendering message:', {
                          id: message.id,
                          senderId: message.senderId,
                          currentUserId: userId,
                          isCurrentUser,
                          content: message.content
                        });
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`p-3 rounded-lg max-w-xs ${
                              isCurrentUser 
                                ? 'bg-indigo-500 text-white' 
                                : 'bg-white shadow-sm'
                            }`}>
                              <p>{message.content}</p>
                              <p className={`text-xs mt-1 ${
                                isCurrentUser 
                                  ? 'text-indigo-200' 
                                  : 'text-gray-500'
                              }`}>
                                {message.timestamp?.toDate ? 
                                  message.timestamp.toDate().toLocaleTimeString() : 
                                  'Just now'
                                }
                              </p>
                              {message.files && message.files.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {message.files.map((file, index) => (
                                    <div key={index} className="flex items-center text-xs">
                                      <File className="w-3 h-3 mr-1" />
                                      <span>{file.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 bg-white">
                  {/* Selected Files Preview */}
                  {selectedFiles.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center bg-gray-100 rounded-lg px-3 py-1">
                          <File className="w-4 h-4 text-gray-500 mr-2" />
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <button
                            onClick={() => removeFile(index)}
                            className="ml-2 text-gray-500 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <div className="flex-1 flex items-center space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      
                      {/* File Upload Button */}
                      <label className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
                        <Paperclip className="w-5 h-5 text-gray-600" />
                        <input
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                          accept="image/*,.pdf,.doc,.docx,.txt"
                        />
                      </label>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={!newMessage.trim() && selectedFiles.length === 0}
                      className="p-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No chat selected</h3>
                  <p className="text-gray-500">Choose a chat from the sidebar to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Matchmaker Component ---
const Matchmaker = ({ db, userId, userName, userType }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [activeChat, setActiveChat] = useState(null); // User object of the person currently chatting with

  // Production RAG Smart Search Handler with Authentication
  const handleSearch = async (e) => {
    e.preventDefault();
    
    setError('');
    setIsSearching(true);
    setSearchResults([]);

    const term = searchQuery.trim();
    if (term.length < 3) {
      setError('Please enter at least 3 characters to search.');
      setIsSearching(false);
      return;
    }

    try {
      console.log(`🔍 Sending production RAG query: "${term}"`);
      
      // Get or refresh authentication token
      let authToken = localStorage.getItem('authToken');
      
      // Always get a fresh token to avoid expiration issues
      try {
        const loginResponse = await fetch('http://localhost:3003/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: 'demo@academic-match.com', 
            password: 'demo123' 
          })
        });
        
        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          authToken = loginData.token;
          localStorage.setItem('authToken', authToken);
        } else {
          throw new Error('Failed to authenticate with backend');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        throw new Error('Unable to authenticate with backend. Please try again.');
      }
      
      // Use different endpoints based on user type
      const endpoint = userType === 'professor' ? 'smart-match-students' : 'smart-match';
      
      const response = await fetch(`http://localhost:3003/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ query: term })
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, clear and retry
          localStorage.removeItem('authToken');
          throw new Error('Authentication expired. Please try again.');
        } else if (response.status === 403) {
          // CORS or permission issue
          throw new Error('Access forbidden. Please refresh the page and try again.');
        }
        throw new Error(`Production RAG API error: ${response.status} ${response.statusText}`);
      }

      const results = await response.json();
      console.log('📊 Production RAG results with Gemini:', results);
      
      setSearchResults(results);
      
      if (results.length === 0) {
        setError(`No smart matches found for "${term}". Try different research interests or keywords.`);
      }

    } catch (err) {
      console.error("Error in production RAG smart matching:", err);
      setError(`Production smart matching error: ${err.message}. Make sure the production RAG backend is running on port 3003.`);
    } finally {
      setIsSearching(false);
    }
  };

  if (activeChat) {
    // Renders the dedicated chat window when a message button is clicked
    return (
      <ChatWindow 
        db={db}
        currentUserId={userId}
        partner={activeChat}
        onEndChat={() => setActiveChat(null)}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-lg mb-6 border border-gray-100">
        <h3 className="text-2xl font-semibold text-indigo-700 mb-4 flex items-center">
          <Zap className="w-6 h-6 mr-2" /> Academic Matchmaker
        </h3>
        <p className="text-gray-600 mb-4">
            {userType === 'professor' 
              ? 'Find students using AI-powered smart matching. Describe what kind of students you\'re looking for (e.g., "students interested in machine learning research" or "undergraduates for data science projects").'
              : 'Find professors using AI-powered smart matching. Describe your research interests naturally (e.g., "I\'m interested in quantum machine learning applications" or "I work on CRISPR gene editing for cancer therapy").'
            }
        </p>
        <form onSubmit={handleSearch} className="flex space-x-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={userType === 'professor' 
              ? "Describe what students you're looking for (e.g., 'students interested in machine learning research')..."
              : "Describe your research interests (e.g., 'quantum machine learning for drug discovery')..."
            }
            className="flex-1 rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500 transition duration-150"
            disabled={isSearching}
          />
          <button
            type="submit"
            disabled={isSearching || searchQuery.length < 3}
            className="flex items-center px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Search className="w-5 h-5 mr-2" />}
            Search
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {/* Smart Search Results */}
      <div className="space-y-4">
        {searchResults.map((match, index) => (
          <div key={match.id} className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-500">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-xl text-gray-900">{match.name}</h3>
                  <div className="flex items-center space-x-2">
                    <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-1 rounded-full">
                      Match #{index + 1}
                    </span>
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                      {Math.round(match.similarityScore * 100)}% Match
                    </span>
                  </div>
                </div>
                <p className="text-md text-indigo-600 mb-2">{match.title} at {match.university}</p>
                <p className="text-sm text-gray-600 mb-3"><strong>Research Area:</strong> {match.researchArea}</p>
                
                {/* Smart Justification */}
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                    <Zap className="w-4 h-4 mr-2" />
                    Why This Match?
                  </h4>
                  <p className="text-blue-800 text-sm leading-relaxed">{match.justification}</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-3 border-t">
              <button
                onClick={async () => {
                  try {
                    console.log('🔍 Starting conversation between:', userId, 'and', match.id);
                    console.log('🔍 User names:', userName, 'and', match.name);
                    
                    // Check if chat already exists between these users
                    const existingChatsQuery = query(
                      collection(db, `artifacts/${appId}/public/data/chats`),
                      where('participants', 'array-contains', userId)
                    );
                    
                    const existingChatsSnapshot = await getDocs(existingChatsQuery);
                    let existingChat = null;
                    
                    console.log('🔍 Found existing chats:', existingChatsSnapshot.docs.length);
                    existingChatsSnapshot.forEach(doc => {
                      const chatData = doc.data();
                      console.log('🔍 Checking chat:', doc.id, 'participants:', chatData.participants);
                      if (chatData.participants.includes(match.id)) {
                        existingChat = { id: doc.id, ...chatData };
                        console.log('✅ Found existing chat:', existingChat);
                      }
                    });

                    let chatId;
                    
                    if (existingChat) {
                      // Use existing chat
                      chatId = existingChat.id;
                    } else {
                    // Create a new chat document
                    const chatData = {
                      participants: [userId, match.id],
                      participantNames: [userName, match.name],
                      lastMessage: '',
                      lastMessageTime: serverTimestamp(),
                      created: serverTimestamp()
                    };

                    console.log('🔍 Creating new chat with data:', chatData);
                    const chatRef = await addDoc(collection(db, `artifacts/${appId}/public/data/chats`), chatData);
                    chatId = chatRef.id;
                    console.log('✅ Chat created with ID:', chatId);
                    }
                    
                    // Create initial message
                    const messageData = {
                      senderId: userId,
                      senderName: userName,
                      content: `Hello ${match.name}! I'm interested in your research.`,
                      timestamp: serverTimestamp(),
                      type: 'text'
                    };

                    console.log('🔍 Creating message with data:', messageData);
                    await addDoc(collection(db, `artifacts/${appId}/public/data/chats/${chatId}/messages`), messageData);
                    console.log('✅ Message created successfully');

                    // Update chat with last message
                    await setDoc(doc(db, `artifacts/${appId}/public/data/chats/${chatId}`), {
                      lastMessage: messageData.content,
                      lastMessageTime: serverTimestamp(),
                      lastMessageSender: userName
                    }, { merge: true });

                    // Create notification for the matched user
                    const notificationData = {
                      professorId: match.id,
                      studentId: userId,
                      studentName: userName,
                      message: `Hello ${match.name}! I'm interested in your research.`,
                      timestamp: serverTimestamp(),
                      read: false,
                      type: 'message'
                    };

                    console.log('🔍 Creating notification:', notificationData);
                    await addDoc(collection(db, `artifacts/${appId}/public/data/notifications`), notificationData);
                    console.log('✅ Notification created successfully');

                    setActiveChat({ id: chatId, participants: [userId, match.id], participantNames: [userName, match.name] });
                    setError('');
                  } catch (error) {
                    console.error('Error starting conversation:', error);
                    setError('Error starting conversation. Please try again.');
                  }
                }}
                className="flex items-center px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition duration-150 shadow-md transform hover:scale-[1.05]"
              >
                <MessageSquare className="w-5 h-5 mr-2" /> Start Conversation
              </button>
            </div>
          </div>
        ))}
        {searchResults.length === 0 && !isSearching && searchQuery.length >= 3 && !error && (
            <div className="text-center p-8 text-gray-500 bg-white rounded-xl shadow-lg">
              <Zap className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No smart matches found for your research interests.</p>
              <p className="text-sm mt-2">Try different keywords or research areas.</p>
            </div>
        )}
      </div>
    </div>
  );
};

const ProfessorManagement = ({ db, userId, userType }) => {
  const [professors, setProfessors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [newProfessor, setNewProfessor] = useState({
    name: '',
    title: '',
    university: '',
    researchArea: '',
    email: '',
    website: '',
    department: '',
    lab: '',
    bio: '',
    keywords: '',
    availability: 'Available for collaborations'
  });

  // Load professors from Firestore
  useEffect(() => {
    if (!db) return;
    
    const professorsCollection = collection(db, `artifacts/${appId}/public/data/professors`);
    const unsubscribe = onSnapshot(professorsCollection, (snapshot) => {
      const fetchedProfessors = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProfessors(fetchedProfessors);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  const handleAddProfessor = async (e) => {
    e.preventDefault();
    if (!db) return;

    try {
      const professorData = {
        ...newProfessor,
        keywords: newProfessor.keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0),
        createdAt: serverTimestamp(),
        addedBy: userId,
        isActive: true
      };

      await addDoc(collection(db, `artifacts/${appId}/public/data/professors`), professorData);
      setNewProfessor({
        name: '',
        title: '',
        university: '',
        researchArea: '',
        email: '',
        website: '',
        department: '',
        lab: '',
        bio: '',
        keywords: '',
        availability: 'Available for collaborations'
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding professor:', error);
    }
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target.result;
      const lines = csv.split('\n');
      const headers = lines[0].split(',');
      const data = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, index) => {
          obj[header.trim()] = values[index]?.trim() || '';
        });
        return obj;
      });
      setCsvData(data);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!db || csvData.length === 0) return;

    try {
      for (const professor of csvData) {
        const professorData = {
          name: professor.name || '',
          title: professor.title || '',
          university: professor.university || '',
          researchArea: professor.researchArea || '',
          email: professor.email || '',
          website: professor.website || '',
          department: professor.department || '',
          lab: professor.lab || '',
          bio: professor.bio || '',
          keywords: professor.keywords ? professor.keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0) : [],
          availability: professor.availability || 'Available for collaborations',
          createdAt: serverTimestamp(),
          addedBy: userId,
          isActive: true
        };

        await addDoc(collection(db, `artifacts/${appId}/public/data/professors`), professorData);
      }
      setCsvData([]);
      setCsvFile(null);
    } catch (error) {
      console.error('Error importing CSV:', error);
    }
  };


  if (userType !== 'professor' && userType !== 'admin') {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-indigo-700 mb-4">Professor Management</h3>
        <p className="text-gray-600">Only professors and admins can manage professor data.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-indigo-700">Professor Management</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Add Professor
            </button>
            <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition cursor-pointer">
              Import CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Add Professor Form */}
        {showAddForm && (
          <form onSubmit={handleAddProfessor} className="mb-6 p-4 border rounded-lg">
            <h4 className="text-lg font-semibold mb-4">Add New Professor</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Full Name"
                value={newProfessor.name}
                onChange={(e) => setNewProfessor({...newProfessor, name: e.target.value})}
                className="p-2 border rounded"
                required
              />
              <input
                type="text"
                placeholder="Title/Position"
                value={newProfessor.title}
                onChange={(e) => setNewProfessor({...newProfessor, title: e.target.value})}
                className="p-2 border rounded"
                required
              />
              <input
                type="text"
                placeholder="University"
                value={newProfessor.university}
                onChange={(e) => setNewProfessor({...newProfessor, university: e.target.value})}
                className="p-2 border rounded"
                required
              />
              <input
                type="text"
                placeholder="Research Area"
                value={newProfessor.researchArea}
                onChange={(e) => setNewProfessor({...newProfessor, researchArea: e.target.value})}
                className="p-2 border rounded"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={newProfessor.email}
                onChange={(e) => setNewProfessor({...newProfessor, email: e.target.value})}
                className="p-2 border rounded"
              />
              <input
                type="url"
                placeholder="Website"
                value={newProfessor.website}
                onChange={(e) => setNewProfessor({...newProfessor, website: e.target.value})}
                className="p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Department"
                value={newProfessor.department}
                onChange={(e) => setNewProfessor({...newProfessor, department: e.target.value})}
                className="p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Lab/Research Group"
                value={newProfessor.lab}
                onChange={(e) => setNewProfessor({...newProfessor, lab: e.target.value})}
                className="p-2 border rounded"
              />
              <textarea
                placeholder="Bio/Description"
                value={newProfessor.bio}
                onChange={(e) => setNewProfessor({...newProfessor, bio: e.target.value})}
                className="p-2 border rounded md:col-span-2"
                rows="3"
              />
              <input
                type="text"
                placeholder="Keywords (comma-separated)"
                value={newProfessor.keywords}
                onChange={(e) => setNewProfessor({...newProfessor, keywords: e.target.value})}
                className="p-2 border rounded md:col-span-2"
              />
            </div>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Add Professor
              </button>
            </div>
          </form>
        )}

        {/* CSV Import */}
        {csvData.length > 0 && (
          <div className="mb-6 p-4 border rounded-lg bg-green-50">
            <h4 className="text-lg font-semibold mb-2">CSV Import Preview ({csvData.length} professors)</h4>
            <div className="max-h-40 overflow-y-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">University</th>
                    <th className="p-2 text-left">Research Area</th>
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 5).map((prof, index) => (
                    <tr key={index}>
                      <td className="p-2">{prof.name}</td>
                      <td className="p-2">{prof.university}</td>
                      <td className="p-2">{prof.researchArea}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvData.length > 5 && <p className="text-sm text-gray-500">... and {csvData.length - 5} more</p>}
            </div>
            <button
              onClick={handleCsvImport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Import All Professors
            </button>
          </div>
        )}

        {/* Professors List */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Current Professors ({professors.length})</h4>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="animate-spin h-6 w-6 text-indigo-500 mr-2" />
              <p className="text-gray-600">Loading professors...</p>
            </div>
          ) : professors.length === 0 ? (
            <p className="text-center p-8 text-gray-500">No professors found. Add some professors to get started!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {professors.map(professor => (
                <div key={professor.id} className="bg-gray-50 p-4 rounded-lg border">
                  <h5 className="font-semibold text-lg">{professor.name}</h5>
                  <p className="text-indigo-600 text-sm">{professor.title}</p>
                  <p className="text-gray-600 text-sm">{professor.university}</p>
                  <p className="text-gray-700 text-sm mt-2">{professor.researchArea}</p>
                  {professor.email && (
                    <p className="text-xs text-gray-500 mt-1">{professor.email}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {professor.keywords?.slice(0, 3).map((keyword, index) => (
                      <span key={index} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                        {keyword}
                      </span>
                    ))}
                    {professor.keywords?.length > 3 && (
                      <span className="text-xs text-gray-500">+{professor.keywords.length - 3} more</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Admin Dashboard Component ---
const AdminDashboard = ({ db, userId }) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    totalMatches: 0,
    activeUsers: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);

  useEffect(() => {
    if (!db) return;

    // Fetch user statistics
    const usersCollection = collection(db, `artifacts/${appId}/public/data/users`);
    const postsCollection = collection(db, `artifacts/${appId}/public/data/posts`);

    const unsubscribeUsers = onSnapshot(usersCollection, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentUsers(users.slice(-5)); // Last 5 users
      setStats(prev => ({ ...prev, totalUsers: users.length }));
    });

    const unsubscribePosts = onSnapshot(postsCollection, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentPosts(posts.slice(-5)); // Last 5 posts
      setStats(prev => ({ ...prev, totalPosts: posts.length }));
    });

    return () => {
      unsubscribeUsers();
      unsubscribePosts();
    };
  }, [db]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
        <h2 className="text-3xl font-bold text-indigo-700 mb-6 flex items-center">
          <User className="w-8 h-8 mr-3" />
          Admin Dashboard
        </h2>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <User className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.totalUsers}</p>
                <p className="text-blue-600">Total Users</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <div className="flex items-center">
              <MessageSquare className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-green-700">{stats.totalPosts}</p>
                <p className="text-green-600">Total Posts</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
            <div className="flex items-center">
              <Zap className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-purple-700">{stats.totalMatches}</p>
                <p className="text-purple-600">Smart Matches</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
            <div className="flex items-center">
              <Globe className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-orange-700">{stats.activeUsers}</p>
                <p className="text-orange-600">Active Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Users</h3>
            <div className="space-y-3">
              {recentUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium">{user.name || 'Anonymous'}</p>
                    <p className="text-sm text-gray-500">{user.userType || 'Unknown'}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {user.createdAt ? formatTimestamp(user.createdAt) : 'Unknown'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Posts</h3>
            <div className="space-y-3">
              {recentPosts.map(post => (
                <div key={post.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium">{post.authorName || 'Anonymous'}</p>
                    <p className="text-sm text-gray-500 truncate max-w-xs">{post.content}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatTimestamp(post.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard'); // Default to dashboard tab
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userType, setUserType] = useState(''); // 'student' or 'professor'
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Profile Data
  const [profileData, setProfileData] = useState({
    name: '',
    title: '',
    university: '',
    researchArea: '',
    keywords: '',
    bio: '',
    yearsExperience: 0,
    isVerified: false,
    userType: '', // 'student' or 'professor'
    department: '',
    degree: '', // For students
    advisor: '', // For students
    lab: '', // For professors
    publications: [], // For professors
    courses: [], // For professors
    interests: [], // For students
    skills: [], // For students
    gpa: '', // For students
    graduationYear: '', // For students
    funding: '', // For professors
    availability: '', // For professors
    timezone: '',
    languages: [],
    socialLinks: {
      linkedin: '',
      github: '',
      website: '',
      orcid: ''
    }
  });

  // 1. FIREBASE INITIALIZATION (Without Auto-Auth)
  useEffect(() => {
    if (!firebaseConfig.apiKey) {
      setMessage('Error: Firebase config is missing. Cannot initialize database.');
      setLoading(false);
      return;
    }

    const initFirebase = async () => {
      try {
        const app = initializeApp(firebaseConfig);
        const newAuth = getAuth(app);
        const newDb = getFirestore(app);

        setAuth(newAuth);
        setDb(newDb);

        const unsubscribe = onAuthStateChanged(newAuth, async (user) => {
          if (user) {
            setUserId(user.uid);
            setShowAuth(false);
            
            // Check if user has completed onboarding
            const userDocRef = doc(newDb, `artifacts/${appId}/public/data/users`, user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists() && userDoc.data().userType) {
              // User has completed onboarding
              setShowOnboarding(false);
            } else {
              // User needs to complete onboarding
              setShowOnboarding(true);
            }
          } else {
            setUserId(null);
            setShowAuth(true);
            setShowOnboarding(false);
          }
          setIsAuthReady(true);
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (e) {
        console.error('Initialization Error:', e);
        setMessage(`Failed to initialize application: ${e.message}`);
        setLoading(false);
      }
    };
    initFirebase();
  }, []);

  // 2. FETCH USER PROFILE DATA (Real Firestore)
  const fetchProfile = useCallback(async (uid) => {
    if (!db || !uid) return;
    try {
      const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        setProfileData(userData);
        // Set userType from profile data
        if (userData.userType) {
          setUserType(userData.userType);
        }
      } else {
        setMessage('Welcome! Please complete your academic profile.');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage(`Failed to load profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (isAuthReady && userId) {
      fetchProfile(userId);
    }
  }, [isAuthReady, userId, fetchProfile]);

  // Listen for notifications (for professors)
  useEffect(() => {
    if (!db || !userId || userType !== 'professor') return;

    const notificationsCollection = collection(db, `artifacts/${appId}/public/data/notifications`);
    const notificationsQuery = query(notificationsCollection, where('professorId', '==', userId));
    
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setNotifications(fetchedNotifications);
      setUnreadCount(fetchedNotifications.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [db, userId, userType]);

  // --- HANDLERS ---

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
  };

  // Set user type manually (for existing users)
  const setUserTypeManually = async (newUserType) => {
    if (!db || !userId) return;
    
    try {
      const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
      await setDoc(userDocRef, {
        userType: newUserType,
        lastUpdated: new Date()
      }, { merge: true });
      
      setUserType(newUserType);
      setProfileData(prev => ({ ...prev, userType: newUserType }));
      setMessage(`User type set to ${newUserType}`);
    } catch (error) {
      console.error('Error setting user type:', error);
      setMessage('Error setting user type. Please try again.');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!db || !userId) {
      setMessage('Authentication not ready. Please wait.');
      return;
    }
    setLoading(true);
    try {
      // CRITICAL: Convert keywords string to a lowercase array for searching
      const keywordsArray = profileData.keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
      
      const dataToSave = {
          ...profileData,
          keywords: keywordsArray, // Store as array for the 'array-contains' query to work
      };

      const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
      await setDoc(userDocRef, dataToSave, { merge: true });
      setMessage('Profile saved successfully! Ready to connect.');
      
      // Update local state to reflect the data structure sent to Firestore for the keywords field
      setProfileData(prev => ({ ...prev, keywords: profileData.keywords })); 
      
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage(`Error saving profile: ${error.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Authentication Handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!auth) return;

    setLoading(true);
    try {
      if (authMode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        // Create user profile
        if (userCredential.user) {
          const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userCredential.user.uid);
          await setDoc(userDocRef, {
            name: authForm.name,
            email: authForm.email,
            title: '',
            university: '',
            researchArea: '',
            keywords: '',
            bio: '',
            yearsExperience: 0,
            isVerified: false,
          });
        }
        setMessage('Account created successfully!');
      } else {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
        setMessage('Signed in successfully!');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setMessage(`Authentication error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthInputChange = (e) => {
    const { name, value } = e.target;
    setAuthForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLogout = async () => {
    if (auth) {
      try {
        await signOut(auth);
        setMessage('You have been signed out.');
        setProfileData({});
      } catch (error) {
        console.error('Logout error:', error);
        setMessage('Logout failed. Try again.');
      }
    }
  };

  // --- ONBOARDING FLOW ---
  const renderOnboarding = () => {
    const onboardingSteps = [
      {
        title: "Welcome to Academic Matchmaker!",
        subtitle: "Let's set up your profile to connect you with the right academic collaborators.",
        content: (
          <div className="space-y-6">
            <div className="text-center">
              <GraduationCap className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Role</h2>
              <p className="text-gray-600">Are you a student looking for research opportunities or a professor seeking collaborators?</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setUserType('student');
                  setOnboardingStep(1);
                }}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
              >
                <div className="flex items-center mb-3">
                  <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
                  <h3 className="text-lg font-semibold">I'm a Student</h3>
                </div>
                <p className="text-gray-600 text-sm">
                  Looking for research opportunities, mentors, and academic collaborations
                </p>
              </button>
              
              <button
                onClick={() => {
                  setUserType('professor');
                  setOnboardingStep(1);
                }}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
              >
                <div className="flex items-center mb-3">
                  <User className="w-8 h-8 text-green-600 mr-3" />
                  <h3 className="text-lg font-semibold">I'm a Professor</h3>
                </div>
                <p className="text-gray-600 text-sm">
                  Seeking research collaborators, students, and academic partnerships
                </p>
              </button>
            </div>
          </div>
        )
      },
      {
        title: userType === 'student' ? "Student Profile Setup" : "Professor Profile Setup",
        subtitle: "Tell us about your academic background and interests.",
        content: (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Dr. Jane Smith"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {userType === 'student' ? 'Degree Program' : 'Current Title/Position'} *
                </label>
                <input
                  type="text"
                  value={userType === 'student' ? profileData.degree : profileData.title}
                  onChange={(e) => setProfileData(prev => ({ 
                    ...prev, 
                    [userType === 'student' ? 'degree' : 'title']: e.target.value 
                  }))}
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder={userType === 'student' ? 'PhD in Computer Science' : 'Professor of Biology'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  University/Institution *
                </label>
                <input
                  type="text"
                  value={profileData.university}
                  onChange={(e) => setProfileData(prev => ({ ...prev, university: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Stanford University"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department *
                </label>
                <input
                  type="text"
                  value={profileData.department}
                  onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Computer Science"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Research Area *
                </label>
                <input
                  type="text"
                  value={profileData.researchArea}
                  onChange={(e) => setProfileData(prev => ({ ...prev, researchArea: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Machine Learning, Quantum Computing, etc."
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keywords for Matching (comma-separated) *
                </label>
                <input
                  type="text"
                  value={profileData.keywords}
                  onChange={(e) => setProfileData(prev => ({ ...prev, keywords: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="AI, machine learning, deep learning, neural networks"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  About Me / Professional Bio *
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Tell us about your research interests, experience, and what you're looking for in collaborations..."
                />
              </div>
            </div>
            
            <div className="flex justify-between pt-6">
              <button
                onClick={() => setOnboardingStep(0)}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => setOnboardingStep(2)}
                disabled={!profileData.name || !profileData.university || !profileData.researchArea}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )
      },
      {
        title: "Additional Information",
        subtitle: "Help us personalize your experience with some additional details.",
        content: (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {userType === 'student' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Advisor/Supervisor
                    </label>
                    <input
                      type="text"
                      value={profileData.advisor}
                      onChange={(e) => setProfileData(prev => ({ ...prev, advisor: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Dr. John Smith"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expected Graduation Year
                    </label>
                    <input
                      type="text"
                      value={profileData.graduationYear}
                      onChange={(e) => setProfileData(prev => ({ ...prev, graduationYear: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="2025"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GPA (Optional)
                    </label>
                    <input
                      type="text"
                      value={profileData.gpa}
                      onChange={(e) => setProfileData(prev => ({ ...prev, gpa: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="3.8"
                    />
                  </div>
                </>
              )}
              
              {userType === 'professor' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lab/Research Group
                    </label>
                    <input
                      type="text"
                      value={profileData.lab}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lab: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="AI Research Lab"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      value={profileData.yearsExperience}
                      onChange={(e) => setProfileData(prev => ({ ...prev, yearsExperience: parseInt(e.target.value) || 0 }))}
                      className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="10"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Research Funding Available
                    </label>
                    <select
                      value={profileData.funding}
                      onChange={(e) => setProfileData(prev => ({ ...prev, funding: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Select funding status</option>
                      <option value="yes">Yes, I have funding</option>
                      <option value="limited">Limited funding available</option>
                      <option value="no">No funding available</option>
                    </select>
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={profileData.timezone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select your timezone</option>
                  <option value="UTC-12">UTC-12 (Baker Island)</option>
                  <option value="UTC-8">UTC-8 (Pacific Time)</option>
                  <option value="UTC-5">UTC-5 (Eastern Time)</option>
                  <option value="UTC+0">UTC+0 (GMT)</option>
                  <option value="UTC+1">UTC+1 (Central European)</option>
                  <option value="UTC+5">UTC+5 (Pakistan Standard Time)</option>
                  <option value="UTC+8">UTC+8 (China Standard Time)</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-between pt-6">
              <button
                onClick={() => setOnboardingStep(1)}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleCompleteOnboarding}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Complete Setup
              </button>
            </div>
          </div>
        )
      }
    ];

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-4xl w-full">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{onboardingSteps[onboardingStep].title}</h1>
              <div className="flex space-x-2">
                {onboardingSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full ${
                      index <= onboardingStep ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-gray-600">{onboardingSteps[onboardingStep].subtitle}</p>
          </div>
          
          {onboardingSteps[onboardingStep].content}
        </div>
      </div>
    );
  };

  // Handle onboarding completion
  const handleCompleteOnboarding = async () => {
    if (!db || !userId) return;
    
    try {
      const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
      await setDoc(userDocRef, {
        ...profileData,
        userType,
        createdAt: new Date(),
        lastUpdated: new Date()
      });
      
      // Update the main userType state
      setUserType(profileData.userType);
      
      setShowOnboarding(false);
      setMessage('Profile setup completed successfully!');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setMessage('Error completing setup. Please try again.');
    }
  };

  // --- AUTHENTICATION FORM ---
  const renderAuthForm = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
        <div className="text-center mb-6">
          <GraduationCap className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Academic Matchmaker</h1>
          <p className="text-gray-600 mt-2">Connect with researchers worldwide</p>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {authMode === 'signup' && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={authForm.name}
                onChange={handleAuthInputChange}
                required={authMode === 'signup'}
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Dr. Jane Smith"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={authForm.email}
              onChange={handleAuthInputChange}
              required
              className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="jane.smith@university.edu"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={authForm.password}
              onChange={handleAuthInputChange}
              required
              className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                {authMode === 'signup' ? 'Creating Account...' : 'Signing In...'}
              </div>
            ) : (
              authMode === 'signup' ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              {authMode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  // --- DASHBOARD COMPONENT ---
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Welcome back, {profileData.name || 'Academic'}!
            </h2>
            <p className="text-indigo-100">
              {profileData.userType === 'student' 
                ? 'Ready to find your next research opportunity?' 
                : 'Ready to connect with talented researchers and students?'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{profileData.userType === 'student' ? '🎓' : '👨‍🏫'}</div>
            <div className="text-sm text-indigo-200">{profileData.userType === 'student' ? 'Student' : 'Professor'}</div>
          </div>
        </div>
      </div>

      {/* Quick Stats - Different for Students vs Professors */}
      <div className="grid md:grid-cols-4 gap-4">
        {profileData.userType === 'student' ? (
          // Student Stats
          <>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Search className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Available Professors</p>
                  <p className="text-lg font-semibold text-gray-900">6</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Active Conversations</p>
                  <p className="text-lg font-semibold text-gray-900">0</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <User className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Potential Mentors</p>
                  <p className="text-lg font-semibold text-gray-900">6</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Research Areas</p>
                  <p className="text-lg font-semibold text-gray-900">{profileData.researchArea ? '1' : '0'}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Professor Stats
          <>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Potential Students</p>
                  <p className="text-lg font-semibold text-gray-900">1</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BellRing className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">New Messages</p>
                  <p className="text-lg font-semibold text-gray-900">{unreadCount}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Globe className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Research Collaborations</p>
                  <p className="text-lg font-semibold text-gray-900">0</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Research Areas</p>
                  <p className="text-lg font-semibold text-gray-900">{profileData.researchArea ? '1' : '0'}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent Activity - Different for Students vs Professors */}
      <div className="grid md:grid-cols-2 gap-6">
        {profileData.userType === 'student' ? (
          // Student Dashboard
          <>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Professors</h3>
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">Dr. Obaid Ur Rehman</p>
                    <p className="text-sm text-gray-500">Air University • Machine Learning</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">Dr. Deesha</p>
                    <p className="text-sm text-gray-500">NUST • AI, OCR</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">Dr. Ammie</p>
                    <p className="text-sm text-gray-500">CUST • Data Science</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setActiveTab('matchmaker')}
                  className="w-full flex items-center p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Search className="w-5 h-5 text-indigo-600 mr-3" />
                  <span className="font-medium text-indigo-900">Find Professors</span>
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className="w-full flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <User className="w-5 h-5 text-green-600 mr-3" />
                  <span className="font-medium text-green-900">Update Profile</span>
                </button>
                <button
                  onClick={() => setActiveTab('feed')}
                  className="w-full flex items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <Globe className="w-5 h-5 text-purple-600 mr-3" />
                  <span className="font-medium text-purple-900">Browse Feed</span>
                </button>
                <button
                  onClick={() => setActiveTab('chats')}
                  className="w-full flex items-center p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <MessageSquare className="w-5 h-5 text-orange-600 mr-3" />
                  <span className="font-medium text-orange-900">My Chats</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          // Professor Dashboard
          <>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BellRing className="w-5 h-5 mr-2 text-green-600" />
                Recent Messages
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unreadCount}</span>
                )}
              </h3>
              <div className="space-y-3">
                {notifications.length > 0 ? (
                  notifications.slice(0, 3).map((notification, index) => (
                    <div key={notification.id} className={`flex items-center p-3 rounded-lg ${!notification.read ? 'bg-blue-50 border-l-4 border-blue-400' : 'bg-gray-50'}`}>
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="font-medium text-gray-900">{notification.studentName || 'Student'}</p>
                        <p className="text-sm text-gray-500">{notification.message || 'Sent you a message'}</p>
                        <p className="text-xs text-gray-400">{formatTimestamp(notification.timestamp)}</p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="font-medium text-gray-900">No new messages</p>
                      <p className="text-sm text-gray-500">Students will appear here when they message you</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Professor Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setActiveTab('matchmaker')}
                  className="w-full flex items-center p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Search className="w-5 h-5 text-indigo-600 mr-3" />
                  <span className="font-medium text-indigo-900">Find Students</span>
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className="w-full flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <User className="w-5 h-5 text-green-600 mr-3" />
                  <span className="font-medium text-green-900">Update Profile</span>
                </button>
                <button
                  onClick={() => setActiveTab('feed')}
                  className="w-full flex items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <Globe className="w-5 h-5 text-purple-600 mr-3" />
                  <span className="font-medium text-purple-900">Browse Feed</span>
                </button>
                <button
                  onClick={() => setActiveTab('chats')}
                  className="w-full flex items-center p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <MessageSquare className="w-5 h-5 text-orange-600 mr-3" />
                  <span className="font-medium text-orange-900">My Chats</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // --- RENDERING TABS ---

  const renderProfileTab = () => (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-800 border-b pb-3 mb-6 flex items-center">
        <User className="w-6 h-6 mr-2 text-indigo-500" />
        {userType === 'professor' ? 'Professor Profile' : userType === 'student' ? 'Student Profile' : 'Academic Profile'}
      </h2>
      
      {/* User Type Selector for existing users */}
      {!userType && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Set Your Role</h3>
          <p className="text-yellow-700 mb-4">Please select your role to access all features:</p>
          <div className="flex space-x-4">
            <button
              onClick={() => setUserTypeManually('student')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              I'm a Student
            </button>
            <button
              onClick={() => setUserTypeManually('professor')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              I'm a Professor
            </button>
          </div>
        </div>
      )}
      
      <p className="text-gray-600 mb-6">
        Complete your profile to be visible to others. (Your 8 modules are represented here.)
      </p>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input 1: Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
            <input type="text" name="name" id="name" value={profileData.name} onChange={handleInputChange} required className="mt-1 block w-full rounded-lg border border-gray-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="Dr. Eleanor Vance"/>
          </div>

          {/* Input 2: Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Current Title/Position</label>
            <input type="text" name="title" id="title" value={profileData.title} onChange={handleInputChange} required className="mt-1 block w-full rounded-lg border border-gray-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="Associate Professor of Astrophysics"/>
          </div>

          {/* Input 3: University */}
          <div>
            <label htmlFor="university" className="block text-sm font-medium text-gray-700">University/Institution</label>
            <input type="text" name="university" id="university" value={profileData.university} onChange={handleInputChange} required className="mt-1 block w-full rounded-lg border border-gray-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="MIT / CERN"/>
          </div>

          {/* Input 4: Years Experience */}
          <div>
            <label htmlFor="yearsExperience" className="block text-sm font-medium text-gray-700">Years of Experience (Numeric)</label>
            <input type="number" name="yearsExperience" id="yearsExperience" min="0" value={profileData.yearsExperience} onChange={handleInputChange} className="mt-1 block w-full rounded-lg border border-gray-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"/>
          </div>

          {/* Input 5: Research Area */}
          <div className="md:col-span-2">
            <label htmlFor="researchArea" className="block text-sm font-medium text-gray-700">Primary Research Area</label>
            <input type="text" name="researchArea" id="researchArea" value={profileData.researchArea} onChange={handleInputChange} required className="mt-1 block w-full rounded-lg border border-gray-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="Quantum Computing, Epigenetics, or Medieval History"/>
          </div>

          {/* Input 6: Keywords for Matching */}
          <div className="md:col-span-2">
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">Keywords for Matching (Comma-separated)</label>
            <textarea name="keywords" id="keywords" rows="2" value={profileData.keywords} onChange={handleInputChange} className="mt-1 block w-full rounded-lg border border-gray-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="machine learning, natural language processing, deep learning, python"/>
          </div>
        </div>

        {/* Input 7: Bio */}
        <div className="mt-6">
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700">About Me / Professional Bio</label>
          <textarea name="bio" id="bio" rows="4" value={profileData.bio} onChange={handleInputChange} required className="block w-full rounded-lg border border-gray-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="I am passionate about connecting theoretical physics with real-world applications..."></textarea>
        </div>

        {/* Input 8: Verification Status (Simulated Module) */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input id="isVerified" name="isVerified" type="checkbox" checked={profileData.isVerified} onChange={handleInputChange} className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"/>
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="isVerified" className="font-medium text-gray-700 flex items-center cursor-pointer">
              <CheckCheck className="w-5 h-5 mr-1 text-green-500" />
              Verification Status (Simulated)
            </label>
            <p className="text-gray-500">Check this box to simulate profile verification by an internal module.</p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-6 border-t mt-8">
          <button
            type="submit"
            disabled={loading || !userId}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-xl text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01]"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5 mr-3" /> : <Send className="w-5 h-5 mr-2" />}
            {profileData.name ? 'Update Profile' : 'Save & Join Network'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderFeedTab = () => (
    <div className="max-w-4xl mx-auto">
      <PostCreator 
        db={db} 
        userId={userId} 
        userName={profileData.name} 
        userTitle={profileData.title} 
        onPostCreated={() => {}}
      />
      <h3 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
        <Globe className="w-6 h-6 mr-2 text-indigo-500" />
        Global Academic Feed
      </h3>
      <PostsFeed 
        db={db} 
        isAuthReady={isAuthReady} 
        userId={userId} 
      />
    </div>
  );

  const renderMatchmakerTab = () => (
    <Matchmaker 
      db={db} 
      userId={userId} 
      userName={profileData.name}
      userType={userType}
    />
  );

  const renderChatsTab = () => (
    <ChatInterface 
      db={db} 
      userId={userId} 
      userName={profileData.name}
      userType={userType}
    />
  );


  // --- UI RENDER ---

  if (loading && !isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500 mr-3" />
        <p className="text-lg text-gray-700">Connecting to Academic Network...</p>
      </div>
    );
  }

  // Show authentication form if user is not logged in
  if (showAuth && !userId) {
    return renderAuthForm();
  }

  // Show onboarding if user is logged in but hasn't completed setup
  if (showOnboarding && userId) {
    return renderOnboarding();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-inter">
      <script src="https://cdn.tailwindcss.com"></script>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white shadow-lg rounded-xl mb-6 sticky top-4 z-10">
        <h1 className="text-3xl font-bold text-indigo-700 flex items-center mb-2 sm:mb-0">
          <GraduationCap className="w-8 h-8 mr-2" />
          Academic Matchmaker
        </h1>
        {userId && (
          <div className="text-sm text-gray-600 flex items-center space-x-4">
            {userType === 'professor' && unreadCount > 0 && (
              <div className="relative">
                <BellRing className="w-6 h-6 text-red-500 animate-pulse" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              </div>
            )}
            <span className="truncate hidden md:inline">
              **User ID:** <code className="bg-gray-100 p-1 rounded text-xs text-indigo-600 font-mono">{userId}</code>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition duration-150 shadow"
            >
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </button>
          </div>
        )}
      </header>
      
      {/* Message and Status Area */}
      {message && (
        <div className={`p-3 mb-4 rounded-lg shadow-md ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} transition-opacity duration-300`}>
          {message}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 mb-6 max-w-4xl mx-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 flex items-center font-medium ${activeTab === 'dashboard' ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <BookOpen className="w-5 h-5 mr-2" /> Dashboard
        </button>
        <button
          onClick={() => setActiveTab('matchmaker')}
          className={`px-4 py-2 flex items-center font-medium ${activeTab === 'matchmaker' ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Zap className="w-5 h-5 mr-2" /> Matchmaker
        </button>
        <button
          onClick={() => setActiveTab('feed')}
          className={`px-4 py-2 flex items-center font-medium ${activeTab === 'feed' ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Globe className="w-5 h-5 mr-2" /> Global Feed
        </button>
        <button
          onClick={() => setActiveTab('chats')}
          className={`px-4 py-2 flex items-center font-medium ${activeTab === 'chats' ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <MessageSquare className="w-5 h-5 mr-2" /> Chats
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 flex items-center font-medium ${activeTab === 'profile' ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Edit2 className="w-5 h-5 mr-2" /> Profile
        </button>
        {userType === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2 flex items-center font-medium ${activeTab === 'admin' ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <User className="w-5 h-5 mr-2" /> Admin
          </button>
        )}
      </div>
      
      {/* Content Area */}
      <main>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'feed' && renderFeedTab()}
        {activeTab === 'matchmaker' && renderMatchmakerTab()}
        {activeTab === 'chats' && renderChatsTab()}
        {activeTab === 'admin' && <AdminDashboard db={db} userId={userId} />}
      </main>

      <footer className="text-center mt-10 text-gray-500 text-sm">
        <p>Built using React, Tailwind CSS, and Google Firestore.</p>
      </footer>
    </div>
  );
};

export default App;
