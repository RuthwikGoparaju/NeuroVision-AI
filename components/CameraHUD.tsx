
import React from 'react';
import { FaceData, EyeLandmarks } from '../types';
import { ScanFace, Activity, Eye, AlertCircle } from 'lucide-react';

interface CameraHUDProps {
  faceData: FaceData;
  blinkCount?: number;
  videoRef: React.RefObject<HTMLVideoElement>;
  width?: number;
  height?: number;
  showLandmarks?: boolean;
}

const CameraHUD: React.FC<CameraHUDProps> = ({ 
  faceData, 
  blinkCount,
  videoRef, 
  showLandmarks = true 
}) => {
  
  // Helper to render eye landmarks if available
  const renderEyeTracking = (eye: EyeLandmarks | undefined) => {
    if (!eye) return null;
    return (
      <g>
         {/* Connected Tracking Mesh - Faint structural reference */}
         <path 
           d={`M ${eye.innerCorner.x * 100} ${eye.innerCorner.y * 100} 
               L ${eye.upperLid.x * 100} ${eye.upperLid.y * 100} 
               L ${eye.outerCorner.x * 100} ${eye.outerCorner.y * 100}
               L ${eye.lowerLid.x * 100} ${eye.lowerLid.y * 100} 
               Z`}
           fill="rgba(16, 185, 129, 0.05)"
           stroke="#10b981"
           strokeWidth="0.5"
           strokeOpacity="0.4"
         />

         {/* Pupil / Iris Center - Green Tracking Circle */}
         <circle 
            cx={`${eye.pupil.x * 100}%`} 
            cy={`${eye.pupil.y * 100}%`} 
            r="1.2" 
            fill="#10b981" 
            fillOpacity="0.8"
            stroke="#059669"
            strokeWidth="0.5"
         />
         
         {/* Lid Reference Points - Minimal size */}
         <circle cx={`${eye.upperLid.x * 100}%`} cy={`${eye.upperLid.y * 100}%`} r="0.4" fill="white" fillOpacity="0.6" />
         <circle cx={`${eye.lowerLid.x * 100}%`} cy={`${eye.lowerLid.y * 100}%`} r="0.4" fill="white" fillOpacity="0.6" />
      </g>
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900 rounded-2xl shadow-inner border border-slate-700">
      
      {/* MIRRORED CONTENT (Video + Landmarks) */}
      <div className="absolute inset-0" style={{ transform: 'scaleX(-1)' }}>
          {/* Video Layer */}
          {/* IMPORTANT: Removed object-cover to prevent cropping. Video stretches to fill container, 
              ensuring landmarks (0-100%) align perfectly with the visible video frame. */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full opacity-90 transform-gpu"
          />
          
          {/* Fallback pattern */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] opacity-10 pointer-events-none"></div>

          {/* AI Overlay Layer - Real Coordinates */}
          {showLandmarks && (
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none" 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
            >
              
              {/* If we have real landmarks, use them. Otherwise fall back to simulated box */}
              {faceData.leftEye && faceData.rightEye ? (
                <>
                  {renderEyeTracking(faceData.leftEye)}
                  {renderEyeTracking(faceData.rightEye)}
                </>
              ) : (
                <>
                    {/* Fallback Visualization (Simulated) */}
                    <rect 
                        x="25%" y="20%" width="50%" height="60%" 
                        rx="10" ry="10"
                        fill="none" 
                        stroke={faceData.confidence > 0.8 ? "rgba(16, 185, 129, 0.5)" : "rgba(239, 68, 68, 0.5)"} 
                        strokeWidth="1"
                        strokeDasharray="5,5"
                        className="animate-pulse"
                        transform={`translate(${faceData.yaw * 2}, ${faceData.pitch * 2})`}
                    />
                    {/* Simulated Eye Centers */}
                    <circle cx={`${40 + faceData.gazeX * 10}%`} cy={`${45 + faceData.gazeY * 10}%`} r="1.5" fill="#10b981" opacity="0.5" />
                    <circle cx={`${60 + faceData.gazeX * 10}%`} cy={`${45 + faceData.gazeY * 10}%`} r="1.5" fill="#10b981" opacity="0.5" />
                </>
              )}

              {/* Central Crosshair */}
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
            </svg>
          )}
      </div>

      {/* NON-MIRRORED UI LAYERS */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 items-start">
        <div className="bg-slate-900/80 backdrop-blur text-xs text-white p-2 rounded border border-slate-700 flex items-center gap-2">
          <ScanFace className="w-4 h-4 text-medical-500" />
          <span>Face Confidence: {(faceData.confidence * 100).toFixed(0)}%</span>
        </div>
        <div className="bg-slate-900/80 backdrop-blur text-xs text-white p-2 rounded border border-slate-700 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Gaze Stability: {(100 - (Math.abs(faceData.gazeX) * 20)).toFixed(0)}%</span>
        </div>
        
        {/* Prominent Blink Counter */}
        {blinkCount !== undefined && (
           <div className="mt-2 bg-slate-900/90 backdrop-blur text-sm text-white pl-2 pr-4 py-2 rounded-lg border border-blue-500/30 shadow-lg shadow-blue-500/10 flex items-center gap-3">
             <div className="bg-blue-500/20 p-1.5 rounded-md">
                <Eye className="w-5 h-5 text-blue-400" />
             </div>
             <div className="flex flex-col leading-none">
                <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mb-0.5">Blinks</span>
                <span className="text-xl font-mono font-bold text-white">{blinkCount}</span>
             </div>
           </div>
        )}
      </div>

      <div className="absolute bottom-4 right-4">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${faceData.blinkDetected ? 'bg-amber-500/80 text-white shadow-lg shadow-amber-500/20 scale-105 transition-transform' : 'bg-emerald-500/80 text-white'}`}>
          <Eye className="w-3 h-3" />
          {faceData.blinkDetected ? 'BLINK DETECTED' : 'TRACKING'}
        </div>
      </div>

      {faceData.confidence < 0.5 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
           <div className="text-center">
             <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-2 animate-bounce" />
             <p className="text-white font-medium">Face not detected clearly.</p>
             <p className="text-slate-300 text-sm">Please move into the light.</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default CameraHUD;
