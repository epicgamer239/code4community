"use client";

import MathLabPageShell from "@/components/mathlab/MathLabPageShell";

export default function MathLabSessionComplete({
  sessionEndData,
  isStudentView,
  onDismiss,
}) {
  const personName = isStudentView
    ? sessionEndData.tutorName || sessionEndData.studentName
    : sessionEndData.studentName;
  const personLabel = isStudentView ? "Tutor" : "Student";

  return (
    <MathLabPageShell
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50"
      contentClassName="flex-1 flex items-center justify-center px-4 py-12 ml-0 md:ml-16 pb-16 md:pb-12"
    >
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Session Complete!</h1>
          <p className="text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
            {isStudentView
              ? "Your tutoring session has ended successfully."
              : `Your tutoring session with ${sessionEndData.studentName} has ended successfully.`}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{personLabel}</h3>
              <p className="text-primary font-medium">{personName}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Course</h3>
              <p className="text-primary font-medium">{sessionEndData.course}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Duration</h3>
              <p className="text-primary font-medium">
                {Math.floor(sessionEndData.duration / 60)}:
                {(sessionEndData.duration % 60).toString().padStart(2, "0")}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-500">Started</p>
                <p className="font-medium">
                  {sessionEndData.startTime?.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }) || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ended</p>
                <p className="font-medium">
                  {sessionEndData.endTime?.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }) || "Unknown"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onDismiss}
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
    </MathLabPageShell>
  );
}
