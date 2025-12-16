import React, { useState, useEffect } from 'react';
import { RehabMode, PatientDetails, SessionAnalysis } from '../types';
import { useFaceTracker, speak } from '../services/aiEngine';
import CameraHUD from './CameraHUD';
import { Play, Pause, Clock, Trophy, ArrowRight, X, AlertTriangle, Eye, Stethoscope, Gauge } from 'lucide-react';
import { generatePDFReport } from '../utils/reportGenerator';

interface RehabExerciseProps {
  mode: RehabMode;
  exerciseType: 'FOLLOW_DOT' | 'BLINK_TRAINING' | 'HEAD_STABILITY';
  durationSeconds?: number;
  onExit: () => void;
  demoProfile?: 'HEALTHY' | 'LOW' | 'HIGH';
  patientDetails: PatientDetails;
}

type DemoState = 'HEALTHY' | 'LOW' | 'HIGH';

const RehabExercise: React.FC<RehabExerciseProps> = ({ 
  mode, 
  exerciseType, 
  durationSeconds = 60,
  onExit,
  demoProfile = 'HEALTHY',
  patientDetails
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [score, setScore] = useState(0); 
  const [sessionBlinks, setSessionBlinks] = useState(0); 
  const [headStabilityScore, setHeadStabilityScore] = useState(100);
  
  // Demo State Override - Initialized with prop
  const [demoState, setDemoState] = useState<DemoState>(demoProfile);
  
  // Pass demoState to hook so simulation physics match immediately
  const { videoRef, faceData, blinkCount, setBlinkCount } = useFaceTracker(mode, isPlaying, demoState);
  
  // Game State
  const [target, setTarget] = useState({ x: 50, y: 50, visible: true });
  const [targetMoveTimer, setTargetMoveTimer] = useState(0);

  // Sync blink count
  useEffect(() => {
    if (isPlaying) {
        setSessionBlinks(blinkCount);
    }
  }, [blinkCount, isPlaying]);

  // Timer Logic
  useEffect(() => {
    if (!isPlaying || isFinished) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          finishSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, isFinished]);

  const finishSession = () => {
    setIsPlaying(false);
    setIsFinished(true);
    speak("Session complete. Analyzing clinical data.");
  };

  const restartSession = () => {
    setIsFinished(false);
    setIsPlaying(false);
    setTimeLeft(durationSeconds);
    setScore(0);
    setBlinkCount(0);
    setSessionBlinks(0);
    setHeadStabilityScore(100);
    setTarget({ x: 50, y: 50, visible: true });
  };

  // Main Game Loop
  useEffect(() => {
    if (!isPlaying || isFinished) return;

    const gameLoop = setInterval(() => {
        if (exerciseType === 'FOLLOW_DOT') {
            // Move dot every 2 seconds
            setTargetMoveTimer(prev => {
                if (prev > 20) {
                    setTarget({
                        x: 10 + Math.random() * 80,
                        y: 15 + Math.random() * 70,
                        visible: true
                    });
                    return 0;
                }
                return prev + 1;
            });

            // Scoring for Dot
            if (faceData.confidence > 0.5) {
                setScore(s => s + 1);
            }

        } else if (exerciseType === 'BLINK_TRAINING') {
            setScore(sessionBlinks);

        } else if (exerciseType === 'HEAD_STABILITY') {
            // Check Head Deviation
            // Yaw and Pitch should be close to 0
            const deviation = Math.abs(faceData.yaw) + Math.abs(faceData.pitch);
            if (deviation > 5) { // 5 degrees tolerance
                // Decrease score rapidly if moving
                setHeadStabilityScore(prev => Math.max(0, prev - 0.2));
            } else {
                // Recover slowly if stable
                setHeadStabilityScore(prev => Math.min(100, prev + 0.05));
            }
        }
    }, 100);

    return () => clearInterval(gameLoop);
  }, [isPlaying, exerciseType, faceData, isFinished, sessionBlinks]);

  const togglePlay = () => {
    if (isFinished) {
        restartSession();
        return;
    }
    
    if (!isPlaying) {
        if (exerciseType === 'BLINK_TRAINING') {
            speak("Starting blink training. Blink normally.");
        } else if (exerciseType === 'HEAD_STABILITY') {
            speak("Keep your head perfectly still within the circle.");
        } else {
            speak("Follow the blue dot.");
        }
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- CLINICAL ANALYSIS ENGINE ---
  const getDetailedAnalysis = (): SessionAnalysis => {
    // Helper to structure output
    const buildReport = (val: number, unit: string, status: any, rec: string, notes: string[]) => ({
        exerciseType: exerciseType.replace('_', ' '),
        duration: durationSeconds,
        score: Math.round(score), // Raw score (or derived)
        clinicalValue: val,
        clinicalUnit: unit,
        status,
        recommendation: rec,
        notes
    });

    // DEMO OVERRIDES
    if (mode === RehabMode.DEMO) {
        switch (exerciseType) {
            case 'BLINK_TRAINING':
                if (demoState === 'LOW') return buildReport(6, 'BPM', 'WARNING', "Blink rate is critically low. Blink awareness exercises recommended.", ["Severe Dry Eye Risk", "Incomplete Blink Pattern"]);
                if (demoState === 'HIGH') return buildReport(42, 'BPM', 'WARNING', "High frequency blinking detected. Monitor for blepharospasm.", ["Excessive Blinking", "Possible Irritation", "Anxiety Indicated"]);
                return buildReport(16, 'BPM', 'GOOD', "Normal spontaneous blink rate observed.", ["Healthy tear film", "Good rhythm"]);
            
            case 'FOLLOW_DOT':
                if (demoState === 'LOW') return buildReport(45, '% Accuracy', 'CRITICAL', "Significant gaze instability detected. Vestibular consult advised.", ["Tracking Latency", "Saccadic Intrusion", "Poor Fixation"]);
                if (demoState === 'HIGH') return buildReport(98, '% Accuracy', 'GOOD', "Oculomotor control is excellent. No deficits found.", ["Smooth Pursuit", "Accurate Saccades"]);
                return buildReport(88, '% Accuracy', 'GOOD', "Tracking falls within normal clinical limits.", ["Good Oculomotor Control"]);

            case 'HEAD_STABILITY':
                 if (demoState === 'LOW') return buildReport(35, '% Stability', 'CRITICAL', "Poor cephalic control. Risk of cervicogenic dizziness.", ["Postural Drift", "Tremor Detected", "Neck Stiffness"]);
                if (demoState === 'HIGH') return buildReport(96, '% Stability', 'GOOD', "Excellent vestibulo-collic reflex function.", ["High Stability", "No Tremor"]);
                return buildReport(82, '% Stability', 'GOOD', "Head stability is adequate for daily tasks.", ["Normal Range of Motion"]);
        }
    }

    // REAL CALCULATION LOGIC
    const durationMins = (durationSeconds - timeLeft) / 60 || 1;
    
    if (exerciseType === 'BLINK_TRAINING') {
        const bpm = Math.round(sessionBlinks / durationMins);
        let status: any = 'GOOD';
        if (bpm < 10) status = 'WARNING';
        if (bpm > 30) status = 'WARNING';
        return buildReport(bpm, 'BPM', status, status === 'GOOD' ? "Healthy blink patterns." : "Abnormal blink rate detected.", bpm < 10 ? ["Possible Dry Eye"] : []);
    } else if (exerciseType === 'HEAD_STABILITY') {
        const stabScore = Math.round(headStabilityScore);
        let status: any = stabScore < 60 ? 'CRITICAL' : (stabScore < 80 ? 'WARNING' : 'GOOD');
        return buildReport(stabScore, '% Stability', status, "Stabilization training ongoing.", []);
    } else {
        const efficiency = Math.min(100, Math.round((score / ((durationSeconds - timeLeft) * 10)) * 100)) || 0;
        let status: any = efficiency < 50 ? 'CRITICAL' : 'GOOD';
        return buildReport(efficiency, '% Accuracy', status, "Gaze control assessment complete.", []);
    }
  };

  const analysis = isFinished ? getDetailedAnalysis() : null;

  const handleSaveReport = () => {
      if (analysis) {
          generatePDFReport(patientDetails, analysis);
      }
      onExit();
  };

  // Generic Gauge Helper
  const renderGauge = (value: number, type: 'BPM' | 'PERCENT') => {
      // Configuration based on type
      let maxScale = 100;
      let lowZoneW = 20;
      let midZoneW = 40;
      let highZoneW = 40;
      let midLabel = "Healthy";
      
      let zoneColors = ["from-red-300 to-amber-300", "from-emerald-400 to-emerald-500", "from-amber-300 to-red-300"]; // Default Blink style

      if (type === 'BPM') {
          maxScale = 50;
      } else {
          lowZoneW = 40;
          midZoneW = 30;
          highZoneW = 30;
          zoneColors = ["from-red-400 to-red-300", "from-amber-300 to-amber-200", "from-emerald-400 to-emerald-500"];
          midLabel = "Improving";
      }

      const percentage = Math.min(100, Math.max(0, (value / maxScale) * 100));
      
      return (
          <div className="w-full mt-4 mb-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                  <span>Low</span>
                  <span className={type === 'BPM' ? "text-emerald-600" : "text-amber-500"}>{midLabel}</span>
                  <span className={type === 'PERCENT' ? "text-emerald-600" : ""}>High</span>
              </div>
              
              <div className="relative h-6 w-full rounded-full overflow-hidden flex shadow-inner">
                  <div className={`w-[${lowZoneW}%] bg-gradient-to-r ${zoneColors[0]} border-r border-white/20`}></div>
                  <div className={`w-[${midZoneW}%] bg-gradient-to-r ${zoneColors[1]} border-r border-white/20 relative`}></div>
                  <div className={`w-[${highZoneW}%] bg-gradient-to-r ${zoneColors[2]}`}></div>
              </div>

              <div className="relative w-full h-8 -mt-7 pointer-events-none">
                  <div 
                      className="absolute top-0 flex flex-col items-center transform -translate-x-1/2 transition-all duration-700 ease-out"
                      style={{ left: `${percentage}%` }}
                  >
                      <div className="w-1.5 h-7 bg-slate-800 rounded-full border-2 border-white shadow-md z-10"></div>
                      <div className="mt-1 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap z-20">
                          {value}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  // --- REPORT CARD VIEW ---
  if (isFinished && analysis) {
      return (
          <div className="flex flex-col h-full bg-slate-50 rounded-xl overflow-hidden relative">
              <div className="flex-1 p-6 overflow-y-auto no-scrollbar">
                  
                  {/* Demo Controls */}
                  {mode === RehabMode.DEMO && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-6 flex justify-between items-center">
                          <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Demo Simulation:</span>
                          <div className="flex gap-2">
                              {(['HEALTHY', 'LOW', 'HIGH'] as DemoState[]).map((s) => (
                                  <button 
                                    key={s}
                                    onClick={() => setDemoState(s)}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-full transition-colors ${demoState === s ? 'bg-amber-600 text-white' : 'bg-white text-amber-600 border border-amber-200'}`}
                                  >
                                      {s}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}

                  <div className="flex flex-col items-center justify-center mb-6">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${analysis.status === 'CRITICAL' ? 'bg-red-100' : 'bg-emerald-100'}`}>
                          {analysis.status === 'CRITICAL' ? (
                              <AlertTriangle className="w-8 h-8 text-red-600" />
                          ) : analysis.status === 'WARNING' ? (
                              <AlertTriangle className="w-8 h-8 text-amber-600" />
                          ) : (
                              <Trophy className="w-8 h-8 text-emerald-600" />
                          )}
                      </div>
                      <h2 className="text-2xl font-bold text-slate-800">Session Complete</h2>
                      <p className="text-slate-500 text-sm">Clinical Analysis Generated</p>
                  </div>

                  {/* Diagnosis Box with Visual Gauge */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
                      <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-slate-800">
                          <Stethoscope className="w-4 h-4 text-medical-500" /> Clinical Assessment
                      </h3>
                      
                      {renderGauge(analysis.clinicalValue, analysis.clinicalUnit === 'BPM' ? 'BPM' : 'PERCENT')}

                      <div className="mt-8 pt-4 border-t border-slate-100">
                         <div className="text-sm font-medium text-slate-800 mb-1">Recommendation:</div>
                         <p className={`text-sm leading-relaxed ${analysis.status !== 'GOOD' ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>
                             {analysis.recommendation}
                         </p>
                      </div>
                  </div>

                  {/* Tips Section */}
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
                      <h4 className="text-sm font-bold text-blue-800 mb-3">Therapeutic Suggestions</h4>
                      <ul className="space-y-3">
                          {analysis.notes.map((note, i) => (
                              <li key={i} className="text-sm text-blue-700 flex gap-2">
                                  <span className="text-blue-500 font-bold">•</span> {note}
                              </li>
                          ))}
                      </ul>
                  </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                   <button 
                          onClick={restartSession}
                          className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                      >
                          Retry
                  </button>
                  <button 
                      onClick={handleSaveReport}
                      className="flex-1 py-3 bg-medical-600 text-white font-bold rounded-xl hover:bg-medical-700 transition-colors shadow-lg shadow-medical-500/30 flex items-center justify-center gap-2"
                  >
                      Save Report <ArrowRight className="w-4 h-4" />
                  </button>
              </div>
          </div>
      );
  }

  // --- GAME HUD OVERLAYS ---
  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden relative">
      <div className="flex-1 relative">
         <CameraHUD 
            faceData={faceData} 
            videoRef={videoRef} 
            blinkCount={isPlaying ? blinkCount : undefined}
            showLandmarks={exerciseType !== 'HEAD_STABILITY'}
         />

         {/* VESTIBULAR (HEAD) OVERLAY */}
         {isPlaying && exerciseType === 'HEAD_STABILITY' && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 {/* Target Zone */}
                 <div className="w-48 h-48 border-4 border-slate-500/30 rounded-full flex items-center justify-center relative">
                     <div className="absolute inset-0 border-2 border-white/10 rounded-full animate-ping"></div>
                     <div className="w-2 h-2 bg-slate-400/50 rounded-full"></div>
                 </div>
                 {/* Live Head Cursor */}
                 <div 
                    className={`absolute w-8 h-8 rounded-full border-4 shadow-lg transition-all duration-100 ${Math.abs(faceData.yaw) + Math.abs(faceData.pitch) < 5 ? 'bg-emerald-500 border-emerald-300' : 'bg-rose-500 border-rose-300'}`}
                    style={{ 
                        transform: `translate(${faceData.yaw * -3}px, ${faceData.pitch * -3}px)` // Invert Yaw for mirror effect
                    }}
                 ></div>
                 
                 <div className="absolute top-8 text-center bg-slate-900/60 backdrop-blur px-4 py-2 rounded-xl">
                     <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stability Score</div>
                     <div className={`text-3xl font-mono font-bold ${headStabilityScore > 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                         {headStabilityScore.toFixed(0)}%
                     </div>
                 </div>
             </div>
         )}

         {/* FOLLOW DOT OVERLAY */}
         {isPlaying && exerciseType === 'FOLLOW_DOT' && (
             <div 
                className="absolute w-6 h-6 bg-medical-500 rounded-full border-2 border-white shadow-[0_0_15px_#0ea5e9] transition-all duration-700 ease-in-out"
                style={{ 
                    left: `${target.x}%`, 
                    top: `${target.y}%`,
                    transform: 'translate(-50%, -50%)'
                }}
             >
                <div className="absolute inset-0 bg-medical-400 rounded-full animate-ping opacity-75"></div>
             </div>
         )}

         {/* BLINK OVERLAY */}
         {isPlaying && exerciseType === 'BLINK_TRAINING' && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10 pointer-events-none">
                 <div className="text-9xl font-bold text-white mb-2 drop-shadow-2xl tracking-tighter opacity-80">{blinkCount}</div>
                 <div className="text-blue-200 font-medium bg-slate-900/40 px-4 py-1 rounded-full backdrop-blur-sm border border-slate-700/50 inline-block">Blinks</div>
             </div>
         )}

         {/* Score HUD (Generic) */}
         {exerciseType !== 'BLINK_TRAINING' && exerciseType !== 'HEAD_STABILITY' && (
             <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-slate-700 p-4 rounded-xl text-right">
                 <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Score</div>
                 <div className="text-3xl font-mono text-white">{score}</div>
             </div>
         )}
         
         {/* Start/Pause Overlay */}
         {!isPlaying && !isFinished && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-20">
                 <div className="text-center p-8 bg-white rounded-2xl max-w-sm shadow-2xl">
                     <div className="mb-4 inline-flex p-4 bg-medical-50 rounded-full text-medical-600">
                        {exerciseType === 'BLINK_TRAINING' ? <Eye className="w-8 h-8" /> : 
                         exerciseType === 'HEAD_STABILITY' ? <Gauge className="w-8 h-8" /> : 
                         <Play className="w-8 h-8" />}
                     </div>
                     <h3 className="text-2xl font-bold text-slate-900 mb-2">
                        {score > 0 || headStabilityScore < 100 ? "Paused" : "Ready to Start?"}
                     </h3>
                     <div className="flex items-center justify-center gap-2 text-slate-500 mb-6 bg-slate-100 py-1 px-3 rounded-full mx-auto w-fit">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs font-bold uppercase">{durationSeconds} Seconds</span>
                     </div>
                     <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                        {exerciseType === 'FOLLOW_DOT' && "Follow the blue dot. Move eyes quickly."}
                        {exerciseType === 'BLINK_TRAINING' && "Blink naturally for analysis."}
                        {exerciseType === 'HEAD_STABILITY' && "Keep your head centered and still."}
                     </p>
                     <button 
                        onClick={togglePlay}
                        className="bg-medical-600 hover:bg-medical-700 text-white w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-xl shadow-medical-500/20"
                    >
                        <Play className="fill-current w-5 h-5" />
                        {score > 0 || headStabilityScore < 100 ? "Resume" : "Start Exercise"}
                    </button>
                    <button onClick={onExit} className="mt-4 text-slate-400 text-sm hover:text-slate-600 flex items-center justify-center gap-1 w-full">
                        <X className="w-4 h-4" /> Cancel
                    </button>
                 </div>
             </div>
         )}
      </div>

      {/* Bottom Control Bar */}
      <div className="h-20 bg-slate-800 border-t border-slate-700 flex items-center justify-between px-6 z-10 relative">
          <button onClick={togglePlay} className="p-3 bg-slate-700 rounded-full text-white hover:bg-slate-600 transition-colors border border-slate-600 disabled:opacity-50" disabled={!isPlaying}>
              <Pause className="fill-current w-6 h-6" />
          </button>
          
          <div className="text-center">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Time Remaining</div>
              <div className={`font-mono text-2xl font-bold ${timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
                  {formatTime(timeLeft)}
              </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700">
              <div className={`w-2 h-2 rounded-full ${faceData.confidence > 0.8 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 animate-pulse'}`}></div>
              <span className="text-xs text-slate-300 font-medium">
                  {faceData.confidence > 0.8 ? 'Tracking Active' : 'Lost Face'}
              </span>
          </div>
      </div>
    </div>
  );
};

export default RehabExercise;