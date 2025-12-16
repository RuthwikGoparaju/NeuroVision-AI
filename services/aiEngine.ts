
import { useState, useEffect, useRef } from 'react';
import { FaceData, RehabMode, EyeLandmarks, Point } from '../types';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

/**
 * NEUROVISION AI ENGINE
 * 
 * Supports two modes:
 * 1. SIMULATION: Generates mathematical waves for demo purposes.
 * 2. REAL SCAN: Uses MediaPipe FaceLandmarker for clinical-grade 
 *    face mesh detection (478 landmarks) including iris tracking.
 */

// Singleton to prevent reloading model on re-renders
let faceLandmarker: FaceLandmarker | null = null;
let isModelLoading = false;

const DEFAULT_FACE_DATA: FaceData = {
  yaw: 0,
  pitch: 0,
  roll: 0,
  eyeOpennessLeft: 0.9,
  eyeOpennessRight: 0.9,
  mouthSymmetry: 0.95,
  gazeX: 0,
  gazeY: 0,
  blinkDetected: false,
  confidence: 0
};

// Smoothing factors. Lower = smoother but more lag.
const POSE_SMOOTHING = 0.5;
const LANDMARK_SMOOTHING = 0.6; // Higher value for landmarks to keep them responsive but less jittery

const lerp = (start: number, end: number, factor: number) => {
  return start + (end - start) * factor;
};

const lerpPoint = (start: Point, end: Point, factor: number): Point => {
  return {
    x: lerp(start.x, end.x, factor),
    y: lerp(start.y, end.y, factor)
  };
};

const smoothEye = (prev: EyeLandmarks | undefined, curr: EyeLandmarks, factor: number): EyeLandmarks => {
  if (!prev) return curr;
  return {
    pupil: lerpPoint(prev.pupil, curr.pupil, factor),
    upperLid: lerpPoint(prev.upperLid, curr.upperLid, factor),
    lowerLid: lerpPoint(prev.lowerLid, curr.lowerLid, factor),
    innerCorner: lerpPoint(prev.innerCorner, curr.innerCorner, factor),
    outerCorner: lerpPoint(prev.outerCorner, curr.outerCorner, factor)
  };
};

// Initialize MediaPipe Vision
const setupModel = async () => {
  if (faceLandmarker || isModelLoading) return;
  isModelLoading = true;
  
  // Suppress specific TFLite info logs that might confuse users
  const originalConsoleInfo = console.info;
  console.info = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('TensorFlow Lite XNNPACK')) return;
    originalConsoleInfo.apply(console, args);
  };
  
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
    );
    
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU"
      },
      outputFaceBlendshapes: true,
      runningMode: "VIDEO",
      numFaces: 1
    });
    console.log("Vision Model Loaded");
  } catch (error) {
    console.error("Failed to load vision model:", error);
  } finally {
    isModelLoading = false;
  }
};

export const useFaceTracker = (mode: RehabMode, active: boolean, demoProfile: 'HEALTHY' | 'LOW' | 'HIGH' = 'HEALTHY') => {
  const [faceData, setFaceData] = useState<FaceData>(DEFAULT_FACE_DATA);
  const [blinkCount, setBlinkCount] = useState(0);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameId = useRef<number>(0);
  const lastBlinkState = useRef<boolean>(false);
  const lastVideoTime = useRef<number>(-1);
  const lastProcessTimeRef = useRef<number>(0);
  
  // Ref to hold previous data for smoothing
  const prevDataRef = useRef<FaceData>(DEFAULT_FACE_DATA);

  useEffect(() => {
    setupModel();
  }, []);

  // --- 1. SIMULATION LOGIC ---
  const simulateData = (time: number): FaceData => {
    
    // --- PROFILE CONFIGURATION ---
    let headStabilityMult = 1.0;
    let blinkRateMult = 1.0;
    let gazeJitter = 0.0;
    let asymmetry = 0.0;

    if (demoProfile === 'LOW') {
        headStabilityMult = 4.0;  // Very unstable head (tremor/drift)
        blinkRateMult = 0.15;     // Staring / Dry eye (very few blinks)
        gazeJitter = 0.15;        // Nystagmus / poor fixation
        asymmetry = 0.2;          // Facial droop
    } else if (demoProfile === 'HIGH') {
        headStabilityMult = 0.2;  // Robotically still (or stiff)
        blinkRateMult = 6.0;      // Excessive blinking (anxiety/blepharospasm)
        gazeJitter = 0.02;        // Hyper-saccadic
    }

    // 1. HEAD POSE DYNAMICS
    const yawBase = Math.sin(time / 4000) * 8 * headStabilityMult; 
    const yawMicro = Math.sin(time / 900) * 1.5 * headStabilityMult;
    const yaw = yawBase + yawMicro;

    const pitchBase = (Math.cos(time / 5000) * 4 + 2) * headStabilityMult; 
    const pitchMicro = Math.sin(time / 1200) * 1.0 * headStabilityMult;
    const pitch = pitchBase + pitchMicro;

    const roll = (Math.sin(time / 6000) * 2 + Math.cos(time / 1500) * 0.5) * headStabilityMult;

    // 2. SACCADIC GAZE
    const SACCADE_INTERVAL = demoProfile === 'HIGH' ? 800 : 1800; 
    const seed = Math.floor(time / SACCADE_INTERVAL);
    
    const targetX = Math.sin(seed * 123.45) * 0.5; 
    const targetY = Math.cos(seed * 678.90) * 0.3; 

    const prevTargetX = Math.sin((seed - 1) * 123.45) * 0.5;
    const prevTargetY = Math.cos((seed - 1) * 678.90) * 0.3;

    const progress = Math.min(1, (time % SACCADE_INTERVAL) / 250); 
    const ease = 1 - Math.pow(1 - progress, 3); 
    
    let scanX = prevTargetX + (targetX - prevTargetX) * ease;
    let scanY = prevTargetY + (targetY - prevTargetY) * ease;

    if (gazeJitter > 0) {
        scanX += (Math.random() - 0.5) * gazeJitter;
        scanY += (Math.random() - 0.5) * gazeJitter;
    }

    // VOR
    const vorX = -(yaw / 35); 
    const vorY = -(pitch / 35);

    const gazeX = scanX + vorX;
    const gazeY = scanY + vorY;

    // 3. BLINK DYNAMICS
    const isSaccading = progress < 0.5;
    const blinkProb = (isSaccading ? 0.005 : 0.001) * blinkRateMult; 
    
    const blinkCycleLen = 3500 / blinkRateMult;
    const blinkCycle = (time % blinkCycleLen) / blinkCycleLen; 
    const isForcedBlink = blinkCycle > 0.96; 
    const isRandomBlink = Math.random() < blinkProb;

    const isBlinking = isForcedBlink || isRandomBlink;

    // 4. EYELID PHYSICS
    let openness = isBlinking ? 0.02 : 0.94; 
    
    if (!isBlinking) {
        const gazeEffect = Math.max(0, gazeY * 0.2);
        const pitchEffect = Math.max(0, pitch * 0.01);
        const tremor = Math.sin(time / 50) * 0.005;
        openness = Math.max(0.1, openness - gazeEffect - pitchEffect + tremor);
    }
    
    const opennessLeft = openness;
    const opennessRight = openness * (1.0 - asymmetry);

    // 5. LANDMARK PROJECTION
    const headXShift = yaw * 0.005;
    const headYShift = pitch * 0.005;
    const irisXShift = gazeX * 0.08;
    const irisYShift = gazeY * 0.08;
    const lidTrackY = irisYShift * 0.5; 
    const blinkOffset = (1 - openness) * 0.035;

    const simLeftEye: EyeLandmarks = {
        pupil: { x: 0.4 + headXShift + irisXShift, y: 0.45 + headYShift + irisYShift },
        upperLid: { x: 0.4 + headXShift, y: 0.42 + headYShift + lidTrackY + blinkOffset },
        lowerLid: { x: 0.4 + headXShift, y: 0.48 + headYShift + (blinkOffset * 0.2) },
        innerCorner: { x: 0.46 + headXShift, y: 0.45 + headYShift },
        outerCorner: { x: 0.34 + headXShift, y: 0.45 + headYShift },
    };
    
    const simRightEye: EyeLandmarks = {
        pupil: { x: 0.6 + headXShift + irisXShift, y: 0.45 + headYShift + irisYShift },
        upperLid: { x: 0.6 + headXShift, y: 0.42 + headYShift + lidTrackY + blinkOffset + (asymmetry * 0.02) },
        lowerLid: { x: 0.6 + headXShift, y: 0.48 + headYShift + (blinkOffset * 0.2) },
        innerCorner: { x: 0.54 + headXShift, y: 0.45 + headYShift },
        outerCorner: { x: 0.66 + headXShift, y: 0.45 + headYShift },
    };

    return {
      yaw,
      pitch,
      roll,
      eyeOpennessLeft: opennessLeft,
      eyeOpennessRight: opennessRight,
      mouthSymmetry: 0.95 - asymmetry,
      gazeX,
      gazeY,
      blinkDetected: isBlinking,
      confidence: 0.98,
      leftEye: simLeftEye,
      rightEye: simRightEye
    };
  };

  // --- 2. REAL COMPUTER VISION LOGIC ---
  const processFrame = (time: number) => {
    // Safety check for video readiness
    if (!faceLandmarker || !videoRef.current || videoRef.current.readyState < 2) {
       return { ...prevDataRef.current, confidence: 0 };
    }

    const video = videoRef.current;
    
    // Only process if video has advanced to avoid duplicate work
    if (video.currentTime === lastVideoTime.current) {
        return prevDataRef.current;
    }
    lastVideoTime.current = video.currentTime;

    let results;
    try {
        results = faceLandmarker.detectForVideo(video, performance.now());
    } catch (e) {
        console.error("Inference error", e);
        return prevDataRef.current;
    }

    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        const blendshapes = results.faceBlendshapes?.[0]?.categories;

        // --- BLINK DETECTION ---
        const blinkLeftScore = blendshapes?.find(c => c.categoryName === 'eyeBlinkLeft')?.score || 0;
        const blinkRightScore = blendshapes?.find(c => c.categoryName === 'eyeBlinkRight')?.score || 0;
        
        const avgBlinkScore = (blinkLeftScore + blinkRightScore) / 2;
        const eyeDiff = Math.abs(blinkLeftScore - blinkRightScore);
        
        const isStrongBlink = avgBlinkScore > 0.5;
        const isSubtleBlink = avgBlinkScore > 0.2 && eyeDiff < 0.2 && blinkLeftScore > 0.1 && blinkRightScore > 0.1;
        
        const isBlinking = isStrongBlink || isSubtleBlink;

        // --- HEAD POSE ---
        const nose = landmarks[1];
        const leftCheek = landmarks[234];
        const rightCheek = landmarks[454];
        
        const midPointX = (rightCheek.x + leftCheek.x) / 2;
        const rawYaw = (nose.x - midPointX) * 200; 
        const eyesMidY = (landmarks[159].y + landmarks[386].y) / 2;
        const rawPitch = (nose.y - eyesMidY - 0.1) * 200;

        // --- RAW LANDMARKS ---
        const rawLeftEye: EyeLandmarks = {
            pupil: { x: landmarks[468].x, y: landmarks[468].y },
            upperLid: { x: landmarks[159].x, y: landmarks[159].y },
            lowerLid: { x: landmarks[145].x, y: landmarks[145].y },
            innerCorner: { x: landmarks[133].x, y: landmarks[133].y },
            outerCorner: { x: landmarks[33].x, y: landmarks[33].y },
        };

        const rawRightEye: EyeLandmarks = {
            pupil: { x: landmarks[473].x, y: landmarks[473].y },
            upperLid: { x: landmarks[386].x, y: landmarks[386].y },
            lowerLid: { x: landmarks[374].x, y: landmarks[374].y },
            innerCorner: { x: landmarks[362].x, y: landmarks[362].y },
            outerCorner: { x: landmarks[263].x, y: landmarks[263].y },
        };

        // --- SMOOTHING ---
        const prev = prevDataRef.current;
        const smoothedData: FaceData = {
            yaw: lerp(prev.yaw, rawYaw, POSE_SMOOTHING),
            pitch: lerp(prev.pitch, rawPitch, POSE_SMOOTHING),
            roll: 0, 
            eyeOpennessLeft: 1.0 - blinkLeftScore,
            eyeOpennessRight: 1.0 - blinkRightScore,
            mouthSymmetry: 0.95,
            gazeX: lerp(prev.gazeX, (nose.x - 0.5) * 2, POSE_SMOOTHING),
            gazeY: lerp(prev.gazeY, (nose.y - 0.5) * 2, POSE_SMOOTHING),
            blinkDetected: isBlinking,
            confidence: 0.99,
            // Smooth the eye landmarks to reduce jitter
            leftEye: smoothEye(prev.leftEye, rawLeftEye, LANDMARK_SMOOTHING),
            rightEye: smoothEye(prev.rightEye, rawRightEye, LANDMARK_SMOOTHING)
        };

        return smoothedData;
    } else {
        return { ...prevDataRef.current, confidence: 0.3, blinkDetected: false }; 
    }
  };


  const startCamera = async () => {
    try {
      if (videoStream) {
        // Stream already exists, don't restart to avoid flicker
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'user', 
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
        } 
      });
      
      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
             videoRef.current?.play().catch(e => console.error("Auto-play prevented", e));
        }
      }
      setPermissionError(null);
    } catch (err) {
      console.error("Camera Error:", err);
      setPermissionError("Camera access denied. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
  };

  // --- MAIN LOOP ---
  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(frameId.current);
      stopCamera();
      return;
    }

    if (mode === RehabMode.REAL && !videoStream && !permissionError) {
      startCamera();
    } else if (mode === RehabMode.DEMO) {
        // We do not stop camera here to allow quick toggle if desired, 
        // but for this app flow, we can stop it to save resources.
        if (videoStream) stopCamera();
    }

    const loop = (time: number) => {
      // Throttle to ~30 FPS (32ms) to prevent main thread blocking
      if (mode === RehabMode.REAL && time - lastProcessTimeRef.current < 32) {
          frameId.current = requestAnimationFrame(loop);
          return;
      }
      lastProcessTimeRef.current = time;

      let data = DEFAULT_FACE_DATA;

      if (mode === RehabMode.REAL) {
         data = processFrame(time);
      } else {
         data = simulateData(time);
      }
      
      prevDataRef.current = data;

      if (data.blinkDetected && !lastBlinkState.current) {
        setBlinkCount(prev => prev + 1);
      }
      lastBlinkState.current = data.blinkDetected;

      setFaceData(data);
      frameId.current = requestAnimationFrame(loop);
    };

    frameId.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId.current);
      // Clean up camera only if unmounting or deactivated
      // Note: We don't stop camera here immediately on every dependency change to prevent flicker 
      // if active stays true.
    };
  }, [active, mode, videoStream, permissionError, demoProfile]); 

  return { videoRef, faceData, blinkCount, setBlinkCount, permissionError };
};


export const speak = (text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
};
