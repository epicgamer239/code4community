"use client";
import { useAuth } from "@/utils/AuthContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from "react";
import DashboardTopBar from "@/components/layout/DashboardTopBar";
import MathLabSidebar from "@/components/mathlab/MathLabSidebar";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { AppCardSkeleton, RequestCardSkeleton } from "@/components/common/SkeletonLoader";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { firestore } from "@/firebase";
import { firestoreToDate, formatRequestTime, formatRequestDateTime } from "@/lib/firestoreDates";
import { MathLabCache, UserCache } from "@/utils/cache";
import { useMathLabDisplayUser } from "@/lib/mathlab/useDisplayUser";
import { MATHLAB_COURSES, tutorCanTakeCourse } from "@/lib/mathlab/courses";
import {
  REQUEST_TYPE_NOW,
  REQUEST_TYPE_SCHEDULED,
  ALLOWED_SCHEDULED_TIMES,
  compareScheduledRequests,
  formatScheduleLabel,
  formatScheduledTimeLabel,
  canStartScheduledSession,
  isExpiredScheduledPending,
  isScheduledRequest,
  normalizeScheduledTime,
  toLocalYmd,
} from "@/lib/mathlab/scheduledRequests";
import { resolveDisplayName, getInitials } from "@/lib/profile";
import { invalidateOnDataChange } from "@/utils/cacheInvalidation";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { canAccess, isTutorOrHigher, isAdminUser } from "@/utils/authorization";
import { mathlabLoginPath } from "@/lib/mathlab/guest";
import {
  mathLabPendingListener,
  mathLabAcceptedListener,
} from "@/lib/mathlab/liveQueueStore";
import { subscribeWhileVisible } from "@/lib/firestore/sharedQueryListener";
import Image from "next/image";

// Component for live updating session timer
function ActiveSessionTimer({ startTime }) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const updateDuration = () => {
      const now = new Date();
      const elapsed = Math.floor((now - startTime) / 1000);
      setDuration(elapsed);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <span className="font-mono font-medium text-primary">
      {formatTime(duration)}
    </span>
  );
}

function MathLabPageContent() {
  const { user, userData, loading } = useAuth();
  const isGuest = !user;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedCourse, setSelectedCourse] = useState("");
  const [requestMode, setRequestMode] = useState(REQUEST_TYPE_NOW); // now | scheduled
  const [scheduledTime, setScheduledTime] = useState("16:20");
  const [scheduledDate, setScheduledDate] = useState(() => toLocalYmd());
  const [scheduleClock, setScheduleClock] = useState(() => Date.now());
  const [tutorQueueTab, setTutorQueueTab] = useState("live"); // live | scheduled
  const [isMatching, setIsMatching] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [mathLabRole, setMathLabRole] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [isLoadingActiveSessions, setIsLoadingActiveSessions] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [studentRequest, setStudentRequest] = useState(null);
  const [previousStudentRequest, setPreviousStudentRequest] = useState(null);
  const [roleChangeMessage, setRoleChangeMessage] = useState("");
  const [sessionStatus, setSessionStatus] = useState(null); // 'accepted', 'started', 'ended'
  const [sessionEndData, setSessionEndData] = useState(null); // Data for session over screen
  const [acceptingRequestId, setAcceptingRequestId] = useState(null);
  const [isEndingSession, setIsEndingSession] = useState(false);
  
  // Use refs to avoid dependency issues
  const studentRequestRef = useRef(studentRequest);
  const previousStudentRequestRef = useRef(previousStudentRequest);
  const sessionDurationRef = useRef(sessionDuration);
  const endingSessionRef = useRef(false);
  
  // Update refs when values change
  useEffect(() => {
    studentRequestRef.current = studentRequest;
  }, [studentRequest]);
  
  useEffect(() => {
    previousStudentRequestRef.current = previousStudentRequest;
  }, [previousStudentRequest]);
  
  useEffect(() => {
    sessionDurationRef.current = sessionDuration;
  }, [sessionDuration]);

  const courses = MATHLAB_COURSES;

  // Custom image component with proper Google URL handling
  const ProfileImage = ({ src, alt, name, className, showOnlineIndicator = false }) => {
    const [imageError, setImageError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Fix Google URLs to work properly
    const getFixedImageUrl = (url) => {
      if (!url) return null;
      
      // If it's a Google URL, fix the format
      if (url.includes('lh3.googleusercontent.com')) {
        // Remove any existing size parameters and add proper ones
        let cleanUrl = url.split('=')[0];
        // Ensure it has the proper format for a 96px image
        return `${cleanUrl}=s96-c`;
      }
      
      return url;
    };

    const fixedSrc = getFixedImageUrl(src);
    const resolvedSrc = fixedSrc && fixedSrc.includes('lh3.googleusercontent.com')
      ? `/api/avatar?u=${encodeURIComponent(src)}&sz=96`
      : fixedSrc;

    const handleError = () => {
      setImageError(true);
      setIsLoading(false);
    };

    const handleLoad = () => {
      setIsLoading(false);
      setImageError(false);
    };

    // Show initials if no src, error, or while loading
    if (!resolvedSrc || imageError) {
      return (
        <div 
          className={`${className} flex items-center justify-center`}
          style={{ 
            background: `linear-gradient(135deg, hsl(${Math.abs(name?.charCodeAt(0) || 0) % 360}, 70%, 50%), hsl(${Math.abs(name?.charCodeAt(1) || 0) % 360}, 70%, 50%))`
          }}
        >
          <span className="text-white font-semibold text-sm">
            {getInitials(name)}
          </span>
          {showOnlineIndicator && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
          )}
        </div>
      );
    }

    return (
      <div className="relative">
        <Image 
          src={resolvedSrc} 
          alt={alt}
          width={96}
          height={96}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
        />
        {isLoading && (
          <div 
            className={`${className} absolute inset-0 flex items-center justify-center`}
            style={{ 
              background: `linear-gradient(135deg, hsl(${Math.abs(name?.charCodeAt(0) || 0) % 360}, 70%, 50%), hsl(${Math.abs(name?.charCodeAt(1) || 0) % 360}, 70%, 50%))`
            }}
          >
            <span className="text-white font-semibold text-sm">
              {getInitials(name)}
            </span>
          </div>
        )}
        {showOnlineIndicator && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
        )}
      </div>
    );
  };

  // No custom filtering — native select handles searching

  const displayUser = useMathLabDisplayUser(user, userData);

  useEffect(() => {
    if (displayUser) setShowRoleSelection(!displayUser.mathLabRole);
  }, [displayUser?.mathLabRole]);
  
  // Helper function to check if user is a tutor (including admins who can also tutor)
  const isTutor = useMemo(() => {
    return (
      isTutorOrHigher(displayUser?.role, displayUser?.mathLabRole) ||
      isAdminUser(displayUser?.role, user?.email)
    );
  }, [displayUser?.mathLabRole, displayUser?.role, user?.email]);

  const isStudentViewRoute = searchParams?.get("view") === "student";
  const hasActiveStudentRequest =
    studentRequest &&
    (studentRequest.status === "pending" || studentRequest.status === "accepted");
  const tutorDashboardBlocked =
    !isGuest && isTutor && !isStudentViewRoute && hasActiveStudentRequest;

  const livePendingRequests = useMemo(
    () => pendingRequests.filter((r) => !isScheduledRequest(r)),
    [pendingRequests],
  );
  const scheduledPendingRequests = useMemo(
    () =>
      pendingRequests
        .filter((r) => isScheduledRequest(r))
        .sort(compareScheduledRequests),
    [pendingRequests],
  );
  const myUpcomingScheduled = useMemo(
    () =>
      activeSessions.filter(
        (s) =>
          s.tutorId === displayUser?.uid &&
          isScheduledRequest(s) &&
          !s.isStarted,
      ),
    [activeSessions, displayUser?.uid],
  );

  useEffect(() => {
    if (myUpcomingScheduled.length === 0) return undefined;
    const id = setInterval(() => setScheduleClock(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [myUpcomingScheduled.length]);
  
  // Check if user is admin
  const isAdmin = useMemo(() => {
    return userData && user && isAdminUser(userData.role, user.email);
  }, [userData, user]);

  // Shared pending-queue listener (one wire for all tutor tabs; pauses when hidden)
  const fetchPendingRequests = useCallback(() => {
    if (!isTutor) {
      return () => {};
    }
    const filterForTutor = (requests) => {
      const list = Array.isArray(requests) ? requests : [];
      return list.filter(
        (req) =>
          tutorCanTakeCourse(displayUser, req.course) &&
          !isExpiredScheduledPending(req),
      );
    };
    const cachedRequests = MathLabCache.getRequests();
    if (cachedRequests && cachedRequests.length >= 0) {
      setPendingRequests(filterForTutor(cachedRequests));
      setIsLoadingRequests(false);
    } else {
      setIsLoadingRequests(true);
    }

    return mathLabPendingListener.subscribe((requests) => {
      setPendingRequests(filterForTutor(requests));
      setIsLoadingRequests(false);
    });
  }, [isTutor, displayUser]);

  // Shared active-sessions listener (status == accepted only)
  const fetchActiveSessions = useCallback(() => {
    if (!isTutor) {
      return () => {};
    }

    setIsLoadingActiveSessions(true);
    const cachedActiveSessions = MathLabCache.getActiveSessions();
    if (cachedActiveSessions && cachedActiveSessions.length >= 0) {
      setActiveSessions(cachedActiveSessions);
      setIsLoadingActiveSessions(false);
    }

    return mathLabAcceptedListener.subscribe((sessions) => {
      setActiveSessions(Array.isArray(sessions) ? sessions : []);
      setIsLoadingActiveSessions(false);
    });
  }, [isTutor]);

  // Fetch active sessions for tutors/admins with real-time updates
  useEffect(() => {
    if (isTutor) {
      const unsubscribe = fetchActiveSessions();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [isTutor, fetchActiveSessions]);

  // Check authorization for Math Lab access
  const isAuthorized = user && userData && canAccess(userData.role, 'mathlab', userData.mathLabRole);

  // Fetch pending requests if user is a tutor
  useEffect(() => {
    if (isTutor) {
      const unsubscribe = fetchPendingRequests();
      
      // Also check for active sessions
      const checkActiveSessions = async () => {
        try {
          const q = query(
            collection(firestore, "tutoringRequests"),
            where("tutorId", "==", displayUser?.uid),
            where("status", "==", "accepted"),
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const acceptedList = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }));
            // Prefer an in-progress or walk-in claim; keep scheduled upcoming on the dashboard.
            const accepted =
              acceptedList.find((a) => a.sessionStartedAt) ||
              acceptedList.find((a) => !isScheduledRequest(a)) ||
              null;
            if (accepted) {
              setActiveSession({
                requestId: accepted.id,
                studentId: accepted.studentId,
                studentName: accepted.studentName,
                studentEmail: accepted.studentEmail,
                course: accepted.course,
                requestType: accepted.requestType || REQUEST_TYPE_NOW,
                scheduledTime: accepted.scheduledTime || null,
                scheduledDate: accepted.scheduledDate || null,
                startTime: accepted.acceptedAt?.toDate ? accepted.acceptedAt.toDate() : new Date()
              });
              
              if (accepted.sessionStartedAt) {
                const sessionStartedAt = accepted.sessionStartedAt?.toDate ? accepted.sessionStartedAt.toDate() : new Date(accepted.sessionStartedAt);
                setSessionStartTime(sessionStartedAt);
                setSessionStatus('started');
                const now = new Date();
                const duration = Math.floor((now - sessionStartedAt) / 1000);
                setSessionDuration(duration);
              } else {
                setSessionStartTime(accepted.acceptedAt?.toDate ? accepted.acceptedAt.toDate() : new Date());
                setSessionStatus('accepted');
              }
            }
          }
        } catch (error) {
        }
      };
      
      checkActiveSessions();
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [displayUser?.mathLabRole, displayUser?.uid, fetchPendingRequests]);


  // Session timer effect
  useEffect(() => {
    let interval;
    // Check if session is active for either tutors or students
    const isSessionActive = (activeSession && sessionStartTime) || 
                           (studentRequest && sessionStatus === 'started' && sessionStartTime);
    
    if (isSessionActive) {
      interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now - sessionStartTime) / 1000);
        setSessionDuration(duration);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession, sessionStartTime, studentRequest, sessionStatus]);

  // Check for student requests (any user who submitted as a student, including tutors)
  useEffect(() => {
    const studentUid = displayUser?.uid;
    if (!studentUid) {
      setStudentRequest(null);
      return;
    }

      const checkStudentRequest = async () => {
        try {
          const q = query(
            collection(firestore, "tutoringRequests"),
            where("studentId", "==", displayUser?.uid),
            where("status", "in", ["pending", "accepted"]),
          );
          
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const match = docs.find(d => d.status === 'pending' || d.status === 'accepted');
            
              if (match && match.status === 'pending') {
                setStudentRequest({
                  id: match.id,
                  course: match.course,
                  status: match.status,
                  createdAt: firestoreToDate(match.createdAt) || new Date(),
                  requestType: match.requestType || REQUEST_TYPE_NOW,
                  scheduledTime: match.scheduledTime || null,
                  scheduledDate: match.scheduledDate || null,
                });
                setPreviousStudentRequest(null); // Clear previous when new request found
              } else if (match && match.status === 'accepted') {
              // Student has been matched with a tutor
              const sessionStartedAt = firestoreToDate(match.sessionStartedAt);
              
              setStudentRequest({
                id: match.id,
                course: match.course,
                status: match.status,
                createdAt: firestoreToDate(match.createdAt),
                tutorName: match.tutorName,
                acceptedAt: firestoreToDate(match.acceptedAt) || new Date(),
                sessionStartedAt: sessionStartedAt,
                requestType: match.requestType || REQUEST_TYPE_NOW,
                scheduledTime: match.scheduledTime || null,
                scheduledDate: match.scheduledDate || null,
              });
              setPreviousStudentRequest(null); // Clear previous when new request found
              
              // Check if session has started
              if (sessionStartedAt) {
                setSessionStatus('started');
                setSessionStartTime(sessionStartedAt);
                // Calculate current session duration
                const now = new Date();
                const duration = Math.floor((now - sessionStartedAt) / 1000);
                setSessionDuration(duration);
              } else {
                setSessionStatus('accepted');
              }
            }
          } else {
            const requestToCheck = studentRequestRef.current || previousStudentRequestRef.current;
            if (requestToCheck && requestToCheck.status === 'accepted') {
              setSessionEndData({
                studentName: requestToCheck.tutorName || 'Tutor',
                studentEmail: requestToCheck.tutorEmail || '',
                tutorName: requestToCheck.tutorName || 'Tutor',
                tutorEmail: requestToCheck.tutorEmail || '',
                course: requestToCheck.course,
                startTime: requestToCheck.sessionStartedAt || requestToCheck.acceptedAt,
                endTime: new Date(),
                duration: sessionDurationRef.current || 0
              });
              setSessionStatus('ended');
            }
            
            // Update previous request state before clearing current
            if (studentRequest) {
              setPreviousStudentRequest(studentRequest);
            }
            setStudentRequest(null);
          }
        } catch (error) {
        }
      };
      
      // Check immediately
      checkStudentRequest();

      let pollInterval = null;
      // Live listener for this student's active requests only; pauses when tab hidden
      const unsubscribe = subscribeWhileVisible(
        () =>
          query(
            collection(firestore, "tutoringRequests"),
            where("studentId", "==", displayUser?.uid),
            where("status", "in", ["pending", "accepted"]),
          ),
        (snapshot) => {
          if (!snapshot.empty) {
            const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            const match = docs.find((d) => d.status === "pending" || d.status === "accepted");

            if (match && match.status === "pending") {
              setStudentRequest({
                id: match.id,
                course: match.course,
                status: match.status,
                createdAt: firestoreToDate(match.createdAt) || new Date(),
                requestType: match.requestType || REQUEST_TYPE_NOW,
                scheduledTime: match.scheduledTime || null,
                scheduledDate: match.scheduledDate || null,
              });
              setPreviousStudentRequest(null);
            } else if (match && match.status === "accepted") {
              const sessionStartedAt = firestoreToDate(match.sessionStartedAt);

              setStudentRequest({
                id: match.id,
                course: match.course,
                status: match.status,
                createdAt: firestoreToDate(match.createdAt),
                tutorName: match.tutorName,
                acceptedAt: firestoreToDate(match.acceptedAt) || new Date(),
                sessionStartedAt: sessionStartedAt,
                requestType: match.requestType || REQUEST_TYPE_NOW,
                scheduledTime: match.scheduledTime || null,
                scheduledDate: match.scheduledDate || null,
              });
              setPreviousStudentRequest(null);

              if (sessionStartedAt) {
                setSessionStatus("started");
                setSessionStartTime(sessionStartedAt);
                const now = new Date();
                const duration = Math.floor((now - sessionStartedAt) / 1000);
                setSessionDuration(duration);
              } else {
                setSessionStatus("accepted");
              }
            }
          } else {
            const requestToCheck = studentRequestRef.current || previousStudentRequestRef.current;
            if (requestToCheck && requestToCheck.status === "accepted") {
              setSessionEndData({
                studentName: resolveDisplayName(displayUser, "Student"),
                studentEmail: displayUser?.email || "",
                course: requestToCheck.course,
                startTime: requestToCheck.sessionStartedAt || requestToCheck.acceptedAt,
                endTime: new Date(),
                duration: sessionDurationRef.current,
              });
              setSessionStatus("ended");
            }

            if (studentRequest) {
              setPreviousStudentRequest(studentRequest);
            }
            setStudentRequest(null);
          }
        },
        () => {
          if (!pollInterval) pollInterval = setInterval(checkStudentRequest, 2000);
        },
      );

      return () => {
        unsubscribe();
        if (pollInterval) clearInterval(pollInterval);
      };
  }, [displayUser?.uid, displayUser?.displayName, displayUser?.email]);

  // No dropdown overlay logic needed with native select

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
  };

  const handleMatchMe = async () => {
    if (!selectedCourse) {
      alert("Please select a course first!");
      return;
    }

    if (!user) {
      router.push(mathlabLoginPath("/mathlab"));
      return;
    }

    const isScheduled = requestMode === REQUEST_TYPE_SCHEDULED;
    if (isScheduled) {
      if (!normalizeScheduledTime(scheduledTime)) {
        alert("Please choose a valid start time.");
        return;
      }
      if (!scheduledDate || scheduledDate < toLocalYmd()) {
        alert("Please choose today or a future date.");
        return;
      }
    }

    setIsMatching(true);
    
    try {
      assertClientRateLimit(
        "tutoringRequestCreate",
        displayUser?.uid
      );
      const requestData = {
        studentId: displayUser?.uid,
        studentName: resolveDisplayName(displayUser, user?.email || "Anonymous Student"),
        studentEmail: displayUser?.email || '',
        course: selectedCourse,
        description: isScheduled
          ? `Scheduled help with ${selectedCourse} (${formatScheduleLabel({
              requestType: REQUEST_TYPE_SCHEDULED,
              scheduledTime,
              scheduledDate,
            })})`
          : `Help needed with ${selectedCourse}`,
        status: 'pending',
        requestType: isScheduled ? REQUEST_TYPE_SCHEDULED : REQUEST_TYPE_NOW,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (isScheduled) {
        requestData.scheduledTime = scheduledTime;
        requestData.scheduledDate = scheduledDate;
      }

      const docRef = await addDoc(collection(firestore, "tutoringRequests"), requestData);
      
      setStudentRequest({
        id: docRef.id,
        course: selectedCourse,
        status: 'pending',
        createdAt: new Date(),
        requestType: requestData.requestType,
        scheduledTime: isScheduled ? scheduledTime : null,
        scheduledDate: isScheduled ? scheduledDate : null,
      });
      
      setIsMatching(false);
      setSelectedCourse("");
      setRequestMode(REQUEST_TYPE_NOW);
    } catch (error) {
      alert(error.message || "Failed to submit request. Please try again.");
      setIsMatching(false);
    }
  };


  // Helper function to format time
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Function to clean up old/expired requests (for future history system)
  const cleanupOldRequests = useCallback(async () => {
    // Only allow teachers and admins to run cleanup
    if (!displayUser || !['teacher', 'admin'].includes(displayUser.role)) {
      return;
    }
    
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      // Query only by status first to avoid composite index requirement
      const pendingRequestsQuery = query(
        collection(firestore, "tutoringRequests"),
        where("status", "==", "pending")
      );
      
      const snapshot = await getDocs(pendingRequestsQuery);
      const batch = [];
      
      // Filter by createdAt / scheduledDate on the client side to avoid composite index
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAt = firestoreToDate(data.createdAt) || new Date(0);
        const expiredScheduled = isExpiredScheduledPending({
          ...data,
          status: "pending",
        });
        
        if (expiredScheduled || (!isScheduledRequest(data) && createdAt < oneDayAgo)) {
          batch.push(deleteDoc(docSnap.ref));
        }
      });
      
      if (batch.length > 0) {
        await Promise.all(batch);
        // Clear cache after cleanup
        MathLabCache.clearAll();
      }
    } catch (error) {
    }
  }, [displayUser]);

  // Cleanup old requests periodically
  useEffect(() => {
    // Run cleanup immediately when component mounts
    cleanupOldRequests();
    
    // Set up periodic cleanup every 30 minutes
    const cleanupInterval = setInterval(cleanupOldRequests, 30 * 60 * 1000);
    
    return () => clearInterval(cleanupInterval);
  }, [cleanupOldRequests]);

  // Refresh cache when page becomes visible to prevent stale data
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && displayUser) {
        // Page became visible, refresh cache
        MathLabCache.clearAll();
        if (isTutor) {
          fetchPendingRequests();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [displayUser, isTutor, fetchPendingRequests]);

  // Function to cancel student request - now deletes from database
  const handleCancelRequest = async () => {
    if (!studentRequest) return;
    
    try {
      assertClientRateLimit(
        "tutoringRequestUpdate",
        displayUser?.uid
      );
      // Delete the request from the database instead of marking as cancelled
      await deleteDoc(doc(firestore, "tutoringRequests", studentRequest.id));
      
      // Clear cache to reflect the deletion
      MathLabCache.clearAll();
      invalidateOnDataChange('tutoring_request', 'cancelled');
      
      setStudentRequest(null);
    } catch (error) {
      alert("Failed to cancel request. Please try again.");
    }
  };

  // End session — idempotent (requestId doc id) + in-flight lock against double-click
  const handleEndSession = async () => {
    if (!activeSession || endingSessionRef.current) return;
    endingSessionRef.current = true;
    setIsEndingSession(true);

    const session = activeSession;
    const requestId = session.requestId;
    const startedAt = sessionStartTime;

    try {
      assertClientRateLimit(
        "tutoringRequestUpdate",
        displayUser?.uid
      );
      const endTime = new Date();
      const elapsed = startedAt
        ? Math.floor((endTime - startedAt) / 1000)
        : 0;
      // Rules require duration > 0
      const durationSecs = Math.max(1, sessionDurationRef.current || elapsed);

      const completedRef = doc(firestore, "completedSessions", requestId);
      const existing = await getDoc(completedRef);

      if (!existing.exists()) {
        await setDoc(completedRef, {
          studentId: session.studentId,
          studentName: session.studentName,
          studentEmail: session.studentEmail || "",
          tutorId: displayUser?.uid,
          tutorName: resolveDisplayName(displayUser, user?.email || "Anonymous Tutor"),
          tutorEmail: displayUser?.email || "",
          course: session.course,
          requestId,
          startTime: startedAt || endTime,
          endTime,
          duration: durationSecs,
          completedAt: endTime,
          status: "completed",
        });
      }

      try {
        await deleteDoc(doc(firestore, "tutoringRequests", requestId));
      } catch {
        // Request may already be gone from a previous end attempt
      }

      MathLabCache.clearAll();
      invalidateOnDataChange("tutoring_session", "ended");
      MathLabCache.setSessions([]);

      setSessionEndData({
        studentName: session.studentName,
        studentEmail: session.studentEmail,
        tutorName: resolveDisplayName(displayUser, user?.email || "Anonymous Tutor"),
        tutorEmail: displayUser?.email || "",
        course: session.course,
        startTime: startedAt,
        endTime,
        duration: durationSecs,
      });
      setSessionStatus("ended");
      setActiveSession(null);
      setSessionStartTime(null);
      setSessionDuration(0);
    } catch (error) {
      // If another click already created the completed doc, finish cleanup instead of erroring
      if (error?.code === "permission-denied" && requestId) {
        try {
          await deleteDoc(doc(firestore, "tutoringRequests", requestId));
        } catch {
          /* ignore */
        }
        MathLabCache.clearAll();
        MathLabCache.setSessions([]);
        setSessionStatus("ended");
        setActiveSession(null);
        setSessionStartTime(null);
        setSessionDuration(0);
      } else {
        alert("Failed to end session. Please try again.");
      }
    } finally {
      endingSessionRef.current = false;
      setIsEndingSession(false);
    }
  };

  // Function for tutors to accept requests (transactional — only one tutor can claim)
  const handleAcceptRequest = async (requestId, studentId, course) => {
    // Check authorization - only tutors and higher can accept requests
    if (!isTutorOrHigher(userData.role, userData.mathLabRole)) {
      alert("You don't have permission to accept requests.");
      return;
    }

    if (acceptingRequestId) return;

    try {
      assertClientRateLimit(
        "tutoringRequestUpdate",
        displayUser?.uid
      );

      const request = pendingRequests.find(req => req.id === requestId);
      if (!request) {
        alert("That request is no longer available.");
        return;
      }

      if (!tutorCanTakeCourse(displayUser, request.course || course)) {
        alert("You are not assigned to tutor this course.");
        return;
      }

      if (activeSession) {
        alert("Finish your current session before accepting another request.");
        return;
      }

      const myUpcomingScheduled = activeSessions.filter(
        (s) =>
          s.tutorId === displayUser?.uid &&
          isScheduledRequest(s) &&
          !s.isStarted,
      );
      if (isScheduledRequest(request) && myUpcomingScheduled.length > 0) {
        alert("You already have an upcoming scheduled session. Start or finish it first.");
        return;
      }

      setAcceptingRequestId(requestId);

      const tutorName = resolveDisplayName(displayUser, user?.email || "Anonymous Tutor");
      const tutorEmail = displayUser?.email || "";
      const tutorUid = displayUser?.uid;

      await runTransaction(firestore, async (tx) => {
        const requestRef = doc(firestore, "tutoringRequests", requestId);
        const snap = await tx.get(requestRef);
        if (!snap.exists()) {
          throw new Error("GONE");
        }
        const data = snap.data();
        if (data.status !== "pending") {
          throw new Error("TAKEN");
        }
        tx.update(requestRef, {
          status: "accepted",
          tutorId: tutorUid,
          tutorName,
          tutorEmail,
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));

      // Scheduled accepts stay on the dashboard until Start; walk-in enters session UI now.
      if (isScheduledRequest(request)) {
        setSessionStatus("");
      } else {
        setActiveSession({
          requestId,
          studentId: request.studentId,
          studentName: request.studentName,
          studentEmail: request.studentEmail,
          course: request.course,
          requestType: REQUEST_TYPE_NOW,
        });
        setSessionStatus("accepted");
      }
    } catch (error) {
      if (error?.message === "TAKEN") {
        alert("Another tutor already accepted this request.");
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else if (error?.message === "GONE") {
        alert("That request was cancelled or removed.");
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else if (error?.code === "permission-denied") {
        alert("Another tutor already accepted this request.");
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else {
        alert("Failed to accept request. Please try again.");
      }
    } finally {
      setAcceptingRequestId(null);
    }
  };

  // Function to start the tutoring session
  const handleStartSession = async () => {
    if (!activeSession) return;
    
    try {
      assertClientRateLimit(
        "tutoringRequestUpdate",
        displayUser?.uid
      );
      const startTime = new Date();
      setSessionStartTime(startTime);
      setSessionDuration(0);
      setSessionStatus('started');
      
      // Update the request document to indicate session has started
      await updateDoc(doc(firestore, "tutoringRequests", activeSession.requestId), {
        sessionStartedAt: startTime,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to start session:", error);
      const detail =
        error?.code === "permission-denied"
          ? " Missing or insufficient permissions."
          : error?.message
            ? ` ${error.message}`
            : "";
      alert(`Failed to start session.${detail}`);
      setSessionStatus("accepted");
      setSessionStartTime(null);
    }
  };

  const handleOpenUpcomingScheduled = (session) => {
    if (activeSession) {
      alert("Finish your current session first.");
      return;
    }
    if (!canStartScheduledSession(session)) {
      alert("You can start this session beginning 15 minutes before the scheduled time.");
      return;
    }
    setActiveSession({
      requestId: session.id,
      studentId: session.studentId,
      studentName: session.studentName,
      studentEmail: session.studentEmail,
      course: session.course,
      requestType: session.requestType || REQUEST_TYPE_SCHEDULED,
      scheduledTime: session.scheduledTime || null,
      scheduledDate: session.scheduledDate || null,
    });
    setSessionStatus("accepted");
  };

  // Function to dismiss session over screen
  const handleDismissSession = () => {
    setSessionEndData(null);
    setSessionStatus(null);
  };

  const handleRoleSelection = useCallback(async () => {
    // Automatically set role to 'student' since that's the only option
    const selectedRole = 'student';
    
    setIsUpdating(true);

    try {
      // Get user ID from multiple sources with proper fallback
      const userId = displayUser?.uid;
      if (!userId) {
        throw new Error("User ID not found. Please try refreshing the page.");
      }

      // Check if user is switching roles
      const currentRole = displayUser?.mathLabRole;
      const isSwitchingToStudent = currentRole === 'tutor' && selectedRole === 'student';
      
      // If switching to student, clear any active tutor sessions
      if (isSwitchingToStudent) {
        // Clear any active session state
        setActiveSession(null);
        setSessionStartTime(null);
        setSessionDuration(0);
        setPendingRequests([]);
        
        // Show message to user
        setRoleChangeMessage("Switched to student role. Any active tutor sessions have been cleared.");
        setTimeout(() => setRoleChangeMessage(""), 5000);
      }

      assertClientRateLimit("profileWrite", userId);
      // Update Firestore
      await updateDoc(doc(firestore, "users", userId), {
        mathLabRole: selectedRole,
        updatedAt: new Date()
      });

      // Update local cache using centralized cache manager
      const updatedUser = { ...displayUser, mathLabRole: selectedRole };
      UserCache.setUserData(updatedUser);
      
      // Invalidate related caches to prevent stale data
      invalidateOnDataChange('mathlab_role', 'update');
      
      // Trigger a custom event to force AuthContext refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userRoleChanged', { 
          detail: { newRole: selectedRole, userId } 
        }));
      }

      // Hide role selection
      setShowRoleSelection(false);
    } catch (error) {
      alert(error.message || "Failed to update role. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  }, [displayUser, user?.uid]);

  // Auto-set role to student if not set and continue to main page
  useEffect(() => {
    if (showRoleSelection && displayUser) {
      handleRoleSelection();
    }
  }, [showRoleSelection, displayUser, handleRoleSelection]);

  // Show loading while AuthContext is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isGuest && !displayUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Remove access denied check - allow all users to access

  // Show session over screen if session just ended (for both tutors and students)
  if (sessionStatus === 'ended' && sessionEndData) {
    // Determine if this is a student or tutor viewing the screen
    const isStudentView = displayUser?.mathLabRole === 'student' || (!displayUser?.mathLabRole && !isTutor);
    const personName = isStudentView ? (sessionEndData.tutorName || sessionEndData.studentName) : sessionEndData.studentName;
    const personLabel = isStudentView ? "Tutor" : "Student";
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <DashboardTopBar 
          title="BRHS Math Lab" 
        />
        <Suspense fallback={null}>
          <MathLabSidebar />
        </Suspense>

        <div className="flex-1 flex items-center justify-center px-4 py-12 ml-0 md:ml-16 pb-16 md:pb-12">
          <div className="max-w-2xl w-full">
            {/* Success Icon */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Session Complete!
              </h1>
              
              <p className="text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
                Your tutoring session has ended successfully.
              </p>
            </div>

            {/* Session Summary */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Person Info (Tutor for students, Student for tutors) */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{personLabel}</h3>
                  <p className="text-primary font-medium">{personName}</p>
                </div>

                {/* Course Info */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Course</h3>
                  <p className="text-primary font-medium">{sessionEndData.course}</p>
                </div>

                {/* Duration Info */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Duration</h3>
                  <p className="text-primary font-medium">
                    {Math.floor(sessionEndData.duration / 60)}:{(sessionEndData.duration % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              </div>

              {/* Session Times */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-500">Started</p>
                    <p className="font-medium">{sessionEndData.startTime?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ended</p>
                    <p className="font-medium">{sessionEndData.endTime?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || 'Unknown'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dismiss Button */}
            <div className="text-center">
              <button
                onClick={handleDismissSession}
                className="px-8 py-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Dismiss</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tutor with an active student request cannot open the tutor dashboard until it is cleared
  if (tutorDashboardBlocked) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardTopBar title="BRHS Math Lab" />
        <Suspense fallback={null}>
          <MathLabSidebar />
        </Suspense>
        <div
          className="flex-1 flex items-center justify-center px-4 py-12 ml-0 md:ml-16 pb-16 md:pb-12"
          style={{ minHeight: "calc(100vh - 80px)" }}
        >
          <div className="max-w-lg w-full card-elevated p-8 rounded-2xl text-center">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">Active tutoring request</h1>
            <p className="text-muted-foreground mb-6">
              You have a current request as a student for{" "}
              <span className="font-medium text-foreground">{studentRequest.course}</span>.
              {studentRequest.status === "pending"
                ? " Cancel it to access the tutor dashboard."
                : " Manage it from Math Lab before accepting requests as a tutor."}
            </p>
            <div className="flex flex-col gap-3">
              {studentRequest.status === "pending" && (
                <button
                  type="button"
                  onClick={handleCancelRequest}
                  className="w-full py-3 px-4 bg-foreground text-background font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  Cancel request
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push("/mathlab?view=student")}
                className="w-full py-3 px-4 border border-border rounded-lg font-medium hover:bg-muted/50 transition-colors"
              >
                Go to Math Lab
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Student matching / session UI (students and tutors on ?view=student)
  if (hasActiveStudentRequest && (!isTutor || isStudentViewRoute)) {
    // If session is started, show the same detailed screen as tutor
    if (sessionStatus === 'started') {
      return (
        <div className="h-dvh max-h-dvh overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
          <DashboardTopBar 
            title="BRHS Math Lab" 
          />
          <Suspense fallback={null}>
          <MathLabSidebar />
        </Suspense>

          <div className="flex-1 min-h-0 flex items-center justify-center px-4 py-6 ml-0 md:ml-16 overflow-hidden">
            <div className="max-w-4xl w-full">
              {/* Session Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
                  <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                  Tutoring Session Active
                </h1>
                
                <p className="text-lg md:text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
                  You are currently being tutored by {studentRequest.tutorName} in {studentRequest.course}
                </p>
              </div>

              {/* Session Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Tutor Info */}
                <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Tutor</h3>
                  <p className="text-primary font-medium">{studentRequest.tutorName}</p>
                </div>

                {/* Course Info */}
                <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Course</h3>
                  <p className="text-primary font-medium">{studentRequest.course}</p>
                  <p className="text-sm text-gray-500 mt-1">Math Lab Session</p>
                </div>

                {/* Session Timer */}
                <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Duration</h3>
                  <div className="text-3xl font-mono font-bold text-primary">
                    {formatTime(sessionDuration)}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Live Timer</p>
                </div>
              </div>

              {/* Session Info */}
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Session started at {sessionStartTime?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || 'Unknown time'}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // For pending or accepted but not started states, show the original matching screen
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <DashboardTopBar 
          title="BRHS Math Lab" 
        />
        <Suspense fallback={null}>
          <MathLabSidebar />
        </Suspense>

        <div className="flex-1 flex items-center justify-center px-4 py-12 ml-0 md:ml-16 pb-16 md:pb-12">
          <div className="max-w-2xl w-full">
            {/* Matching Header */}
            <div className="text-center mb-12">
              <div className="relative w-32 h-32 mb-6 mx-auto">
                <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg 
                    className="w-12 h-12 text-primary search-scan-animation" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{
                      animation: 'searchScan 3s ease-in-out infinite'
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <style jsx>{`
                  @keyframes searchScan {
                    0% {
                      transform: translate(0, 0) scale(1);
                      opacity: 1;
                    }
                    25% {
                      transform: translate(8px, -6px) scale(1.05);
                      opacity: 0.9;
                    }
                    50% {
                      transform: translate(-6px, 8px) scale(1.1);
                      opacity: 0.95;
                    }
                    75% {
                      transform: translate(6px, 4px) scale(1.05);
                      opacity: 0.9;
                    }
                    100% {
                      transform: translate(0, 0) scale(1);
                      opacity: 1;
                    }
                  }
                `}</style>
              </div>
              
              {studentRequest.status === 'pending' ? (
                <>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    {isScheduledRequest(studentRequest)
                      ? "Looking for a Tutor"
                      : "Finding Your Tutor"}
                  </h1>
                  
                  <p className="text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
                    {isScheduledRequest(studentRequest)
                      ? `We're matching you with a tutor for ${studentRequest.course} · ${formatScheduleLabel(studentRequest)}`
                      : `We're searching for the perfect tutor for ${studentRequest.course}`}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Tutor Found!
                  </h1>
                  
                  <p className="text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
                    {isScheduledRequest(studentRequest)
                      ? `${studentRequest.tutorName} accepted your ${formatScheduleLabel(studentRequest)} request for ${studentRequest.course}`
                      : `${studentRequest.tutorName} will be tutoring you in ${studentRequest.course}`}
                  </p>
                </>
              )}
            </div>

            {/* Request Info Card */}
            <div className="bg-white rounded-2xl border-2 border-primary/20 p-8 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Course Info */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Course</h3>
                  <p className="text-primary font-medium">{studentRequest.course}</p>
                </div>

                {/* Status Info */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    {studentRequest.status === 'pending' ? (
                      <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Status</h3>
                  <p className={`font-medium ${
                    studentRequest.status === 'pending' 
                      ? 'text-yellow-600' 
                      : 'text-green-600'
                  }`}>
                    {studentRequest.status === 'pending' 
                      ? 'Searching...' 
                      : 'Matched!'
                    }
                  </p>
                </div>
              </div>

              {/* Request Details */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="text-center">
                  {isScheduledRequest(studentRequest) && (
                    <p className="text-sm font-medium text-primary mb-2">
                      {formatScheduleLabel(studentRequest)}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    Request submitted at {formatRequestTime(studentRequest.createdAt)}
                  </p>
                  {studentRequest.status === 'accepted' && (
                    <p className="text-sm text-gray-500 mt-1">
                      Accepted at {formatRequestTime(studentRequest.acceptedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="text-center space-y-4">
              {studentRequest.status === 'pending' && (
                <button
                  onClick={handleCancelRequest}
                  className="px-8 py-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-gray-500/25 hover:shadow-xl hover:shadow-gray-500/30"
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel Request
                  </div>
                </button>
              )}
              
              {studentRequest.status === 'accepted' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <div className="flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-lg font-semibold text-green-800">Tutoring Session Ready!</span>
                  </div>
                  <p className="text-green-700 text-center">
                    {isScheduledRequest(studentRequest)
                      ? `Your tutor ${studentRequest.tutorName} accepted. Meet them ${formatScheduleLabel(studentRequest)}.`
                      : `Your tutor ${studentRequest.tutorName} is ready to begin. They will start the session shortly.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show session over screen if session just ended
  if (sessionStatus === 'ended' && sessionEndData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <DashboardTopBar 
          title="BRHS Math Lab" 
        />
        <Suspense fallback={null}>
          <MathLabSidebar />
        </Suspense>

        <div className="flex-1 flex items-center justify-center px-4 py-12 ml-0 md:ml-16 pb-16 md:pb-12">
          <div className="max-w-2xl w-full">
            {/* Session Over Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Session Complete!
              </h1>
              
              <p className="text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
                Your tutoring session with {sessionEndData.studentName} has ended successfully.
              </p>
            </div>

            {/* Session Summary */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Student Info */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Student</h3>
                  <p className="text-primary font-medium">{sessionEndData.studentName}</p>
                </div>

                {/* Course Info */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Course</h3>
                  <p className="text-primary font-medium">{sessionEndData.course}</p>
                </div>

                {/* Duration Info */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Duration</h3>
                  <p className="text-primary font-medium">
                    {Math.floor(sessionEndData.duration / 60)}:{(sessionEndData.duration % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              </div>

              {/* Session Times */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-500">Started</p>
                    <p className="font-medium">{sessionEndData.startTime?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ended</p>
                    <p className="font-medium">{sessionEndData.endTime?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || 'Unknown'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dismiss Button */}
            <div className="text-center">
              <button
                onClick={handleDismissSession}
                className="px-8 py-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Dismiss
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show tutoring session if active
  if (activeSession && isTutor) {
    const isSessionStarted = sessionStatus === 'started';
    
    return (
      <div className="h-dvh max-h-dvh overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
        <DashboardTopBar 
          title="BRHS Math Lab" 
        />
        <Suspense fallback={null}>
          <MathLabSidebar />
        </Suspense>

        <div className="flex-1 min-h-0 flex items-center justify-center px-4 py-6 ml-0 md:ml-16 overflow-hidden">
          <div className="max-w-4xl w-full">
            {/* Session Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                {isSessionStarted ? 'Tutoring Session Active' : 'Session Ready to Start'}
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
                {isSessionStarted 
                  ? `You are currently tutoring ${activeSession.studentName} in ${activeSession.course}`
                  : isScheduledRequest(activeSession)
                    ? `Scheduled ${formatScheduleLabel(activeSession)} with ${activeSession.studentName} (${activeSession.course}). Start when you meet.`
                    : `You have accepted ${activeSession.studentName}'s request for ${activeSession.course}. Ready to begin?`
                }
              </p>
            </div>

            {/* Session Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Student Info */}
              <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Student</h3>
                <p className="text-primary font-medium">{activeSession.studentName}</p>
              </div>

              {/* Course Info */}
              <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Course</h3>
                <p className="text-primary font-medium">{activeSession.course}</p>
                <p className="text-sm text-gray-500 mt-1">Math Lab Session</p>
              </div>

              {/* Session Timer or Status */}
              <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {isSessionStarted ? 'Session Duration' : 'Status'}
                </h3>
                {isSessionStarted ? (
                  <>
                    <div className="text-3xl font-mono font-bold text-primary">
                      {formatTime(sessionDuration)}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Live Timer</p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-yellow-600">
                      Ready
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Waiting to start</p>
                  </>
                )}
              </div>
            </div>

            {/* Session Actions */}
            <div className="text-center">
              {isSessionStarted ? (
                <>
                  <button
                    type="button"
                    onClick={handleEndSession}
                    disabled={isEndingSession}
                    className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 disabled:opacity-60 disabled:pointer-events-none disabled:transform-none"
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {isEndingSession ? "Ending…" : "End Session"}
                    </div>
                  </button>
                  
                  <p className="text-sm text-gray-500 mt-4">
                    Session started at {sessionStartTime?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || 'Unknown time'}
                  </p>
                </>
              ) : (
                <>
                  <button
                    onClick={handleStartSession}
                    className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30"
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Start Session
                    </div>
                  </button>
                  
                  <p className="text-sm text-gray-500 mt-4">
                    Click &quot;Start Session&quot; when you&apos;re ready to begin tutoring
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ overscrollBehavior: "none" }}>
      {/* Use the reusable DashboardTopBar component */}
      <DashboardTopBar title="BRHS Math Lab" />
      <Suspense fallback={null}>
        <Suspense fallback={null}>
          <MathLabSidebar />
        </Suspense>
      </Suspense>

      {/* Role Change Message */}
      {roleChangeMessage && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-6 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">{roleChangeMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        className={`flex-1 flex justify-center ml-0 md:ml-16 pb-16 md:pb-8 ${
          !isGuest && isTutor && !isStudentViewRoute
            ? "items-start pt-8 md:pt-10"
            : "items-center"
        }`}
        style={{ minHeight: "calc(100vh - 80px)" }}
      >        {!isGuest && isTutor && !isStudentViewRoute ? (
          // Tutor Dashboard - Redesigned with Horizontal Grid
          <div className="max-w-7xl w-full mx-4">
            {/* Header Section */}
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-foreground mb-4">Tutor Dashboard</h2>
              <div className="inline-flex space-x-1 bg-muted/30 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setTutorQueueTab("live")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    tutorQueueTab === "live"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Live requests
                  {livePendingRequests.length > 0 ? ` (${livePendingRequests.length})` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => setTutorQueueTab("scheduled")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    tutorQueueTab === "scheduled"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Scheduled requests
                  {scheduledPendingRequests.length > 0
                    ? ` (${scheduledPendingRequests.length})`
                    : ""}
                </button>
              </div>
            </div>

            {tutorQueueTab === "scheduled" && myUpcomingScheduled.length > 0 && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-foreground mb-4">Your Upcoming Sessions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myUpcomingScheduled.map((session) => {
                    const startAllowed = canStartScheduledSession(
                      session,
                      new Date(scheduleClock),
                    );
                    const startDisabled = Boolean(activeSession) || !startAllowed;
                    return (
                      <div
                        key={session.id}
                        className="bg-white border-2 border-primary/40 rounded-2xl p-6 shadow-lg"
                      >
                        <h4 className="font-semibold text-gray-900 text-lg truncate mb-1">
                          {session.studentName}
                        </h4>
                        <p className="text-sm text-primary font-medium mb-2">
                          {formatScheduleLabel(session)}
                        </p>
                        <p className="text-sm text-gray-600 mb-4">{session.course}</p>
                        <button
                          type="button"
                          disabled={startDisabled}
                          onClick={() => handleOpenUpcomingScheduled(session)}
                          className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-xl disabled:bg-gray-300 disabled:text-gray-600 disabled:hover:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {startAllowed ? "Start when ready" : "Available 15 min before"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tutorQueueTab === "live" ? (
            <div className="mb-8">
              {isLoadingRequests ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <RequestCardSkeleton />
                  <RequestCardSkeleton />
                </div>
              ) : livePendingRequests.length === 0 ? (
                <div className="text-center py-10 bg-muted/30 rounded-2xl border border-dashed border-border">
                  <p className="text-muted-foreground">No live requests right now</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {livePendingRequests.map((request) => (
                    <div key={request.id} className="bg-white border-2 border-gray-400 rounded-2xl p-6 shadow-2xl shadow-gray-400/80 transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-center space-x-4 mb-4">
                        <ProfileImage
                          src={request.studentPhotoURL}
                          alt={request.studentName}
                          name={request.studentName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-800"
                          showOnlineIndicator={false}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-lg truncate">{request.studentName}</h4>
                          <p className="text-sm text-gray-600 truncate">Student</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                          {request.course}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 mb-6">
                        <span>Requested {formatRequestDateTime(request.createdAt)}</span>
                      </div>
                      <button
                        type="button"
                        disabled={Boolean(acceptingRequestId) || Boolean(activeSession)}
                        onClick={() => handleAcceptRequest(request.id, request.studentId, request.course)}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-xl disabled:opacity-60 disabled:pointer-events-none"
                      >
                        {acceptingRequestId === request.id ? "Accepting…" : "Accept Request"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            ) : (
            <div className="mb-8">
              {isLoadingRequests ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <RequestCardSkeleton />
                </div>
              ) : scheduledPendingRequests.length === 0 ? (
                <div className="text-center py-10 bg-muted/30 rounded-2xl border border-dashed border-border">
                  <p className="text-muted-foreground">No scheduled requests</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {scheduledPendingRequests.map((request) => (
                    <div key={request.id} className="bg-white border-2 border-gray-400 rounded-2xl p-6 shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-center space-x-4 mb-4">
                        <ProfileImage
                          src={request.studentPhotoURL}
                          alt={request.studentName}
                          name={request.studentName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white"
                          showOnlineIndicator={false}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-lg truncate">{request.studentName}</h4>
                          <p className="text-sm text-primary font-medium truncate">
                            {formatScheduleLabel(request)}
                          </p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                          {request.course}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 mb-6">
                        <span>Posted {formatRequestDateTime(request.createdAt)}</span>
                      </div>
                      <button
                        type="button"
                        disabled={
                          Boolean(acceptingRequestId) ||
                          Boolean(activeSession) ||
                          myUpcomingScheduled.length > 0
                        }
                        onClick={() => handleAcceptRequest(request.id, request.studentId, request.course)}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-xl disabled:opacity-60 disabled:pointer-events-none"
                      >
                        {acceptingRequestId === request.id ? "Accepting…" : "Accept Scheduled"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* Active Sessions Section — admins only (read-only overview) */}
            {isAdmin && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-foreground">Active Tutoring Sessions</h3>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Live updates</span>
                  </div>
                </div>
                
                {isLoadingActiveSessions ? (
                  <div className="card-elevated p-8 rounded-xl">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                    </div>
                  </div>
                ) : activeSessions.length === 0 ? (
                  <div className="card-elevated p-8 rounded-xl text-center">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-foreground mb-2">No Active Sessions</h4>
                    <p className="text-muted-foreground">There are currently no active tutoring sessions</p>
                  </div>
                ) : (
                  <div className="card-elevated rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Tutor</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Student</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Course</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Duration</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Started</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeSessions.map((session) => {
                            const formatTime = (seconds) => {
                              const hours = Math.floor(seconds / 3600);
                              const minutes = Math.floor((seconds % 3600) / 60);
                              const secs = seconds % 60;
                              if (hours > 0) {
                                return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                              }
                              return `${minutes}:${secs.toString().padStart(2, '0')}`;
                            };
                            
                            // Calculate current duration in real-time if session has started
                            const now = new Date();
                            const currentDuration = session.isStarted 
                              ? Math.floor((now - session.sessionStartedAt) / 1000)
                              : 0;
                            
                            return (
                              <tr key={session.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm text-foreground">
                                  <div className="font-medium">{session.tutorName}</div>
                                </td>
                                <td className="px-4 py-3 text-sm text-foreground">
                                  <div className="font-medium">{session.studentName}</div>
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-foreground">
                                  <div>{session.course}</div>
                                  {isScheduledRequest(session) && (
                                    <div className="text-xs font-normal text-muted-foreground mt-0.5">
                                      {formatScheduleLabel(session)}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-foreground">
                                  {session.isStarted ? (
                                    <ActiveSessionTimer startTime={session.sessionStartedAt} />
                                  ) : (
                                    <span className="text-muted-foreground">Not started</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-foreground">
                                  {session.isStarted 
                                    ? session.sessionStartedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                    : session.acceptedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                  }
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        ) : (
          // Student Dashboard
          <div className="max-w-3xl w-full mx-4">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-4">Welcome to the Math Lab!</h2>
              <p className="text-lg text-muted-foreground">
                Get help now, or schedule a start time
              </p>
            </div>

            <div className="card-elevated p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <div className="min-w-0">
                  <label htmlFor="course-select" className="block text-sm font-semibold mb-3 text-foreground">
                    Select Your Course
                  </label>
                  <select
                    id="course-select"
                    className="select w-full"
                    value={selectedCourse}
                    onChange={(e) => handleCourseSelect(e.target.value)}
                    aria-label="Select your course"
                  >
                    <option value="" disabled>{selectedCourse ? 'Change course' : 'Choose a course'}</option>
                    {courses.map((course) => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>
                </div>

                <fieldset className="min-w-0">
                  <legend className="block text-sm font-semibold mb-3 text-foreground">
                    When do you need help?
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      aria-pressed={requestMode === REQUEST_TYPE_NOW}
                      onClick={() => setRequestMode(REQUEST_TYPE_NOW)}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                        requestMode === REQUEST_TYPE_NOW
                          ? "bg-foreground text-background border-foreground"
                          : "bg-background text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      Now
                    </button>
                    <button
                      type="button"
                      aria-pressed={requestMode === REQUEST_TYPE_SCHEDULED}
                      onClick={() => setRequestMode(REQUEST_TYPE_SCHEDULED)}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                        requestMode === REQUEST_TYPE_SCHEDULED
                          ? "bg-foreground text-background border-foreground"
                          : "bg-background text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      Schedule
                    </button>
                  </div>
                </fieldset>
              </div>

              {requestMode === REQUEST_TYPE_SCHEDULED && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 pt-1 border-t border-border">
                  <div className="min-w-0 pt-5 md:pt-5">
                    <label htmlFor="scheduled-date" className="block text-sm font-semibold mb-2 text-foreground">
                      Date
                    </label>
                    <input
                      id="scheduled-date"
                      type="date"
                      className="select w-full"
                      min={toLocalYmd()}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div className="min-w-0 pt-0 md:pt-5">
                    <label htmlFor="scheduled-time" className="block text-sm font-semibold mb-2 text-foreground">
                      Start time
                    </label>
                    <select
                      id="scheduled-time"
                      className="select w-full"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    >
                      <optgroup label="Morning (7:00 – 9:15)">
                        {ALLOWED_SCHEDULED_TIMES.filter((t) => t < "12:00").map((t) => (
                          <option key={t} value={t}>
                            {formatScheduledTimeLabel(t)}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Afternoon (4:20 – 6:00)">
                        {ALLOWED_SCHEDULED_TIMES.filter((t) => t >= "12:00").map((t) => (
                          <option key={t} value={t}>
                            {formatScheduledTimeLabel(t)}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      10-minute steps · Morning until 9:15 · Afternoon 4:20–6:00
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-1">
                <button
                  onClick={handleMatchMe}
                  disabled={!selectedCourse || isMatching}
                  className="btn-primary w-full sm:w-auto sm:min-w-[220px] text-base py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMatching ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Submitting request...
                    </div>
                  ) : requestMode === REQUEST_TYPE_SCHEDULED ? (
                    <>
                      Post Scheduled Request
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </>
                  ) : (
                    <>
                      Submit Tutoring Request
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                Need help? Email brhsc4c@gmail.com for assistance.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MathLabPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <MathLabPageContent />
    </Suspense>
  );
}
