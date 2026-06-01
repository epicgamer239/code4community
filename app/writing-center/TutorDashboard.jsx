"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/utils/AuthContext";
import { firestore } from "@/firebase";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";

export default function TutorDashboard() {
  const [sessions, setSessions] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    let interval;
    if (sessionStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  useEffect(() => {
    if (user && firestore) {
      // Query all sessions and filter client-side to avoid index requirement
      const q = query(collection(firestore, 'sessions'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Fetched sessions:', sessionsData.length);
        setSessions(sessionsData);
        
        // Check if there's an active IN_PROGRESS session for this tutor
        const activeInProgress = sessionsData.find(s => 
          s.status === 'IN_PROGRESS' && s.tutorId === user.uid
        );
        if (activeInProgress && !activeSession) {
          setActiveSession(activeInProgress);
          if (activeInProgress.sessionStartTime) {
            setSessionStartTime(new Date(activeInProgress.sessionStartTime).getTime());
          }
        }
      }, (err) => {
        console.error('Failed to fetch sessions:', err);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleAccept = async (sessionId) => {
    try {
      await updateDoc(doc(firestore, 'sessions', sessionId), {
        tutorId: user.uid,
        tutorName: user.displayName || user.email,
        tutorEmail: user.email,
        status: 'ACCEPTED',
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      setError(err.message || 'Failed to accept session');
    }
  };

  const handleStartSession = async (session) => {
    setActiveSession(session);
    setSessionStartTime(Date.now());
    setElapsedTime(0);
    try {
      await updateDoc(doc(firestore, 'sessions', session.id), {
        status: 'IN_PROGRESS',
        sessionStartTime: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    // Show complete modal instead of directly ending session
    setSelectedSession(activeSession);
    setShowCompleteModal(true);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const compressImage = (file, maxWidth = 1920, maxHeight = 1080, quality = 0.7) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (maxHeight / height) * width;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            file.type,
            quality
          );
        };
      };
    });
  };

  const handleComplete = async () => {
    if (isSubmitting) return;

    setLoading(true);
    setIsSubmitting(true);
    setError('');

    try {
      await updateDoc(doc(firestore, 'sessions', selectedSession.id), {
        status: 'COMPLETED',
        sessionEndTime: new Date().toISOString(),
        duration: elapsedTime,
        updatedAt: new Date().toISOString()
      });

      setShowCompleteModal(false);
      setSelectedSession(null);
      setProofFile(null);
      setActiveSession(null);
      setSessionStartTime(null);
      setElapsedTime(0);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to complete session');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const availableSessions = sessions.filter(s => s.status === 'PENDING' || s.status === 'ACCEPTED');
  const mySessions = sessions.filter(s => s.tutorId === user?.uid && (s.status === 'ACCEPTED' || s.status === 'COMPLETED' || s.status === 'IN_PROGRESS'));
  
  console.log('Available sessions:', availableSessions.length);
  console.log('My sessions:', mySessions.length);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">Writing Center - Tutor Dashboard</h1>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('available')}
            className={`${
              activeTab === 'available'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Available Requests ({availableSessions.length})
          </button>
          <button
            onClick={() => setActiveTab('my-sessions')}
            className={`${
              activeTab === 'my-sessions'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            My Sessions ({mySessions.length})
          </button>
        </nav>
      </div>

      {activeTab === 'available' ? (
        <div>
          {activeSession && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-purple-900">Active Session</h3>
                  <p className="text-sm text-purple-700">{activeSession.subject} - {activeSession.studentName}</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-purple-900">{formatTime(elapsedTime)}</div>
                  <button
                    onClick={handleEndSession}
                    className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                  >
                    End Session
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {availableSessions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No available requests at the moment.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {availableSessions.map((session) => (
                  <li key={session.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-indigo-600">{session.subject}</p>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(session.status)}`}>
                            {session.status}
                          </span>
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                            {session.sessionType}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">Student: {session.studentName}</p>
                        <p className="mt-1 text-sm text-gray-500">{new Date(session.createdAt).toLocaleDateString()}</p>
                        {session.notes && (
                          <p className="mt-1 text-sm text-gray-600">{session.notes}</p>
                        )}
                        {session.sessionType === 'ASYNC' && session.asyncFileUrl && (
                          <a
                            href={session.asyncFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-indigo-600 hover:text-indigo-900"
                          >
                            Download Student's Writing
                          </a>
                        )}
                      </div>
                      {session.status === 'PENDING' ? (
                        <button
                          onClick={() => handleAccept(session.id)}
                          className="ml-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                        >
                          Accept
                        </button>
                      ) : session.status === 'ACCEPTED' && session.tutorId === user?.uid ? (
                        <button
                          onClick={() => handleStartSession(session)}
                          className="ml-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                        >
                          Start Session
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {mySessions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No sessions yet.</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {mySessions.map((session) => (
                <li key={session.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-indigo-600">{session.subject}</p>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          {session.sessionType}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">Student: {session.studentName}</p>
                      <p className="mt-1 text-sm text-gray-500">{new Date(session.createdAt).toLocaleDateString()}</p>
                      {session.notes && (
                        <p className="mt-1 text-sm text-gray-600">{session.notes}</p>
                      )}
                      {session.sessionType === 'ASYNC' && session.asyncFileUrl && (
                        <a
                          href={session.asyncFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-indigo-600 hover:text-indigo-900"
                        >
                          Download Student's Writing
                        </a>
                      )}
                      {session.status === 'COMPLETED' && session.proofFileUrl && (
                        <a
                          href={session.proofFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 ml-2 inline-block text-indigo-600 hover:text-indigo-900"
                        >
                          Proof File
                        </a>
                      )}
                    </div>
                    {session.status === 'ACCEPTED' && (
                      <button
                        onClick={() => {
                          setSelectedSession(session);
                          setShowCompleteModal(true);
                        }}
                        className="ml-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showCompleteModal && selectedSession && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Complete Session
              </h3>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}
              <div className="mb-4">
                <p className="text-sm text-gray-600">Complete this session?</p>
              </div>
              <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCompleteModal(false);
                    setSelectedSession(null);
                    setProofFile(null);
                    setError('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
