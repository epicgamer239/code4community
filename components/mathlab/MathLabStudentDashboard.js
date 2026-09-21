"use client";

import {
  ALLOWED_SCHEDULED_TIMES,
  REQUEST_TYPE_NOW,
  REQUEST_TYPE_SCHEDULED,
  formatScheduledTimeLabel,
  toLocalYmd,
} from "@/lib/mathlab/scheduledRequests";
import { MATHLAB_COURSES } from "@/lib/mathlab/courses";

export default function MathLabStudentDashboard({
  selectedCourse,
  onCourseSelect,
  requestMode,
  onRequestModeChange,
  scheduledDate,
  onScheduledDateChange,
  scheduledTime,
  onScheduledTimeChange,
  isMatching,
  onMatchMe,
}) {
  return (
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
              onChange={(e) => onCourseSelect(e.target.value)}
              aria-label="Select your course"
            >
              <option value="" disabled>
                {selectedCourse ? "Change course" : "Choose a course"}
              </option>
              {MATHLAB_COURSES.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
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
                onClick={() => onRequestModeChange(REQUEST_TYPE_NOW)}
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
                onClick={() => onRequestModeChange(REQUEST_TYPE_SCHEDULED)}
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
                onChange={(e) => onScheduledDateChange(e.target.value)}
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
                onChange={(e) => onScheduledTimeChange(e.target.value)}
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
            type="button"
            onClick={onMatchMe}
            disabled={!selectedCourse || isMatching}
            className="btn-primary w-full sm:w-auto sm:min-w-[220px] text-base py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMatching ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
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

      <div className="text-center mt-6">
        <p className="text-sm text-muted-foreground">
          Need help? Email brhsc4c@gmail.com for assistance.
        </p>
      </div>
    </div>
  );
}
