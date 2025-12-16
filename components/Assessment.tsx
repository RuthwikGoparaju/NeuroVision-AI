import React, { useState, useEffect } from 'react';
import { RehabMode, FaceData } from '../types';
import { useFaceTracker, speak } from '../services/aiEngine';
import CameraHUD from './CameraHUD';
import { ArrowRight, CheckCircle2, RotateCw } from 'lucide-react';

interface AssessmentProps {
  mode: RehabMode;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 'intro', title: 'Prepare for Assessment', duration: 5, prompt: "Ensure your face is well-lit and centered. Remove glasses if possible." },
  { id: 'calibration', title: 'Calibration', duration: 3, prompt: "Look straight at the camera and hold still." },
  { id: 'eye_track', title: 'Oculomotor Control', duration: 10, prompt: "Follow the green dot with your eyes without moving your head." },
  { id: 'face_sym', title: 'Facial Symmetry', duration: 8, prompt: "Smile widely, then relax. Raise your eyebrows." },
  { id: 'head_stab', title: 'Head Stability', duration: 8, prompt: "Keep your head perfectly still while focusing on the center." },
  { id: 'complete', title: 'Analyzing Data', duration: 3, prompt: "Processing your results..." },
];

const Assessment: React.FC<AssessmentProps> = ({ mode, onComplete, onCancel }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(STEPS[0].duration);
  const [score, setScore] = useState(70); // Baseline
  
  const { videoRef, faceData, blinkCount } = useFaceTracker(mode, true);
  const currentStep = STEPS[stepIndex];

  useEffect(() => {
    // Announce step
    speak(currentStep.prompt);
  }, [stepIndex]);

  useEffect(() => {
    if (stepIndex >= STEPS.length - 1) {
        setTimeout(() => {
            onComplete(Math.floor(Math.random() * 20) + 75); // Random score 75-95 for demo
        }, 3000);
        return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStepIndex((s) => s + 1);
          return STEPS[stepIndex + 1]?.duration || 0;
        }
        return prev - 1;
      });
      
      // Calculate "Real-time" scoring logic based on simulation
      if (faceData.confidence > 0.8) {
          setScore(s => Math.min(100, s + 0.1));
      } else {
          setScore(s => Math.max(0, s - 0.5));
      }

    }, 1000);

    return () => clearInterval(timer);
  }, [stepIndex, faceData]);

  // Dynamic visual element for the "Eye Tracking" step
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
  useEffect(() => {
    if (currentStep.id === 'eye_track') {
        const interval = setInterval(() => {
            setTargetPos({
                x: 50 + Math.sin(Date.now() / 1000) * 40,
                y: 50 + Math.cos(Date.now() / 1000) * 30
            });
        }, 50);
        return () => clearInterval(interval);
    } else {
        setTargetPos({ x: 50, y: 50 });
    }
  }, [currentStep.id]);


  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
        <div>
            <h2 className="text-lg font-bold text-slate-800">{currentStep.title}</h2>
            <p className="text-sm text-slate-500">Step {stepIndex + 1} of {STEPS.length}</p>
        </div>
        <div className="text-2xl font-mono font-bold text-medical-600 w-12 text-center">
            {timeLeft}s
        </div>
      </div>

      {/* Main Vision Area */}
      <div className="flex-1 relative bg-black">
        <CameraHUD faceData={faceData} videoRef={videoRef} blinkCount={blinkCount} />
        
        {/* Augmented Reality Overlays for Specific Steps */}
        <div className="absolute inset-0 pointer-events-none">
            {currentStep.id === 'intro' && (
                <div className="absolute inset-0 border-4 border-medical-500/30 rounded-lg m-4 flex items-center justify-center">
                    <p className="text-white bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">Align Face Here</p>
                </div>
            )}
            
            {currentStep.id === 'eye_track' && (
                <div 
                    className="absolute w-6 h-6 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)] transition-all duration-75"
                    style={{ left: `${targetPos.x}%`, top: `${targetPos.y}%`, transform: 'translate(-50%, -50%)' }}
                />
            )}

            {currentStep.id === 'head_stab' && (
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-4 rounded-full transition-colors ${Math.abs(faceData.yaw) < 5 ? 'border-green-500' : 'border-red-500'}`} />
            )}
        </div>

        {/* Instructions Overlay */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
             <div className="bg-slate-900/80 backdrop-blur-md text-white px-6 py-3 rounded-full text-lg font-medium shadow-lg max-w-[90%] text-center">
                {currentStep.prompt}
             </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between">
        <button 
            onClick={onCancel}
            className="px-4 py-2 text-slate-500 font-medium hover:text-slate-800"
        >
            Cancel Assessment
        </button>
        <div className="flex gap-2">
            {/* Steps auto-advance, but could add manual override here if needed */}
        </div>
      </div>
    </div>
  );
};

export default Assessment;