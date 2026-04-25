"use client";

import { useState, useEffect, useRef } from "react";
import { AppPageLayout } from "@/components/common/AppPageLayout";

export default function StudyTimerPage() {
  const [activeTab, setActiveTab] = useState("stopwatch");
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  
  const [timerTime, setTimerTime] = useState(0);
  const [timerInput, setTimerInput] = useState("5:00");
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  
  const [pomodoroWorkTime, setPomodoroWorkTime] = useState(25);
  const [pomodoroBreakTime, setPomodoroBreakTime] = useState(5);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroPaused, setPomodoroPaused] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState("work");
  const [showSettings, setShowSettings] = useState(false);
  
  const stopwatchInterval = useRef(null);
  const timerInterval = useRef(null);
  const pomodoroInterval = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE");
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (stopwatchRunning) {
      stopwatchInterval.current = setInterval(() => {
        setStopwatchTime(prev => prev + 10);
      }, 10);
    } else {
      if (stopwatchInterval.current) {
        clearInterval(stopwatchInterval.current);
      }
    }
    return () => {
      if (stopwatchInterval.current) {
        clearInterval(stopwatchInterval.current);
      }
    };
  }, [stopwatchRunning]);

  useEffect(() => {
    if (timerRunning && !timerPaused && timerTime > 0) {
      timerInterval.current = setInterval(() => {
        setTimerTime(prev => {
          if (prev <= 1000) {
            setTimerRunning(false);
            playBeep();
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      if (timerTime === 0 && timerRunning) {
        playBeep();
      }
    }
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [timerRunning, timerPaused, timerTime]);

  useEffect(() => {
    if (pomodoroRunning && !pomodoroPaused && pomodoroTime > 0) {
      pomodoroInterval.current = setInterval(() => {
        setPomodoroTime(prev => {
          if (prev <= 1) {
            setPomodoroRunning(false);
            playBeep();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pomodoroInterval.current) {
        clearInterval(pomodoroInterval.current);
      }
      if (pomodoroTime === 0 && pomodoroRunning) {
        playBeep();
      }
    }
    return () => {
      if (pomodoroInterval.current) {
        clearInterval(pomodoroInterval.current);
      }
    };
  }, [pomodoroRunning, pomodoroPaused, pomodoroTime]);

  const playBeep = () => {
    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.play().catch(e => console.log("Audio play failed:", e));
    }
  };

  const stopBeep = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  const formatSeconds = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTimerInput = (input) => {
    const parts = input.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      if (!isNaN(minutes) && !isNaN(seconds)) {
        return (minutes * 60 + seconds) * 1000;
      }
    }
    return 0;
  };

  const startStopwatch = () => setStopwatchRunning(true);
  const stopStopwatch = () => setStopwatchRunning(false);
  const resetStopwatch = () => {
    setStopwatchRunning(false);
    setStopwatchTime(0);
  };

  const startTimer = () => {
    const time = parseTimerInput(timerInput);
    if (time > 0) {
      setTimerTime(time);
      setTimerRunning(true);
      setTimerPaused(false);
      stopBeep();
    }
  };

  const pauseTimer = () => setTimerPaused(true);
  const resumeTimer = () => setTimerPaused(false);
  const stopTimer = () => {
    setTimerRunning(false);
    setTimerPaused(false);
    stopBeep();
  };
  const resetTimer = () => {
    setTimerRunning(false);
    setTimerPaused(false);
    setTimerTime(0);
    stopBeep();
  };

  const startPomodoro = () => {
    setPomodoroTime(pomodoroMode === "work" ? pomodoroWorkTime * 60 : pomodoroBreakTime * 60);
    setPomodoroRunning(true);
    setPomodoroPaused(false);
    stopBeep();
  };

  const pausePomodoro = () => setPomodoroPaused(true);
  const resumePomodoro = () => setPomodoroPaused(false);
  const stopPomodoro = () => {
    setPomodoroRunning(false);
    setPomodoroPaused(false);
    stopBeep();
  };

  const switchPomodoroMode = () => {
    const newMode = pomodoroMode === "work" ? "break" : "work";
    setPomodoroMode(newMode);
    setPomodoroTime(newMode === "work" ? pomodoroWorkTime * 60 : pomodoroBreakTime * 60);
    setPomodoroRunning(false);
    setPomodoroPaused(false);
  };

  return (
    <AppPageLayout>
      <main className="flex-1 border-t border-border px-6 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">Study Timer</h1>
          
          <div className="bg-background border border-border rounded-lg p-1 mb-8">
            <div className="flex space-x-1">
              {["stopwatch", "timer", "pomodoro"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "stopwatch" && (
            <div className="bg-background border border-border rounded-lg p-8 text-center">
              <div className="text-6xl font-mono font-bold text-foreground mb-8">
                {formatTime(stopwatchTime)}
              </div>
              <div className="flex justify-center space-x-4">
                {!stopwatchRunning ? (
                  <button
                    onClick={startStopwatch}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 active:bg-primary/80 transition-colors"
                  >
                    Start
                  </button>
                ) : (
                  <button
                    onClick={stopStopwatch}
                    className="px-6 py-3 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 active:bg-destructive/80 transition-colors"
                  >
                    Stop
                  </button>
                )}
                <button
                  onClick={resetStopwatch}
                  className="px-6 py-3 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 active:bg-muted/70 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {activeTab === "timer" && (
            <div className="bg-background border border-border rounded-lg p-8 text-center">
              <div className="text-6xl font-mono font-bold text-foreground mb-8">
                {timerRunning ? formatSeconds(Math.floor(timerTime / 1000)) : timerInput}
              </div>
              
              {!timerRunning && (
                <div className="flex justify-center items-center space-x-2 mb-6">
                  <input
                    type="text"
                    value={timerInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      const validChars = value.replace(/[^0-9:]/g, '');
                      setTimerInput(validChars);
                    }}
                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground font-mono text-center w-24"
                    placeholder="5:00"
                  />
                  <span className="text-sm text-muted-foreground">(minutes:seconds)</span>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                {!timerRunning ? (
                  <button
                    onClick={startTimer}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 active:bg-primary/80 transition-colors"
                  >
                    Start
                  </button>
                ) : (
                  <>
                    {!timerPaused ? (
                      <button
                        onClick={pauseTimer}
                        className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 active:bg-yellow-800 transition-colors"
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={resumeTimer}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 active:bg-green-800 transition-colors"
                      >
                        Resume
                      </button>
                    )}
                    <button
                      onClick={stopTimer}
                      className="px-6 py-3 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 active:bg-destructive/80 transition-colors"
                    >
                      Stop
                    </button>
                  </>
                )}
                <button
                  onClick={resetTimer}
                  className="px-6 py-3 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 active:bg-muted/70 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {activeTab === "pomodoro" && (
            <div className="bg-background border border-border rounded-lg p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center space-x-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    pomodoroMode === "work" 
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" 
                      : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  }`}>
                    {pomodoroMode === "work" ? "Work Time" : "Break Time"}
                  </span>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center space-x-1 p-2 text-muted-foreground hover:text-foreground transition-all duration-200 hover:translate-x-1"
                  >
                    <span>⚙️</span>
                    <span className="text-xs">Change Work & Study Times</span>
                  </button>
                </div>
                
                <div className="text-6xl font-mono font-bold text-foreground mb-8">
                  {formatSeconds(pomodoroTime)}
                </div>

                {showSettings && (
                  <div className="mb-6 p-4 bg-muted rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Work Time (minutes)
                        </label>
                        <input
                          type="number"
                          value={pomodoroWorkTime}
                          onChange={(e) => setPomodoroWorkTime(Math.max(1, parseInt(e.target.value) || 25))}
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Break Time (minutes)
                        </label>
                        <input
                          type="number"
                          value={pomodoroBreakTime}
                          onChange={(e) => setPomodoroBreakTime(Math.max(1, parseInt(e.target.value) || 5))}
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-center space-x-4">
                  {!pomodoroRunning ? (
                    <button
                      onClick={startPomodoro}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 active:bg-primary/80 transition-colors"
                    >
                      Start {pomodoroMode === "work" ? "Work" : "Break"}
                    </button>
                  ) : (
                    <>
                      {!pomodoroPaused ? (
                        <button
                          onClick={pausePomodoro}
                          className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 active:bg-yellow-800 transition-colors"
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          onClick={resumePomodoro}
                          className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 active:bg-green-800 transition-colors"
                        >
                          Resume
                        </button>
                      )}
                      <button
                        onClick={stopPomodoro}
                        className="px-6 py-3 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 active:bg-destructive/80 transition-colors"
                      >
                        Stop
                      </button>
                    </>
                  )}
                  {pomodoroTime === 0 && !pomodoroRunning && (
                    <button
                      onClick={switchPomodoroMode}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 active:bg-primary/80 transition-colors"
                    >
                      Start {pomodoroMode === "work" ? "Break" : "Work"}
                    </button>
                  )}
                  {pomodoroMode === "break" && (
                    <button
                      onClick={() => {
                        stopPomodoro();
                        setPomodoroMode("work");
                        setPomodoroTime(pomodoroWorkTime * 60);
                      }}
                      className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 active:bg-orange-800 transition-colors"
                    >
                      Start Work Early
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </AppPageLayout>
  );
}
