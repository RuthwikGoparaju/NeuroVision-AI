
export enum AppView {
  HOME = 'HOME',
  ASSESSMENT = 'ASSESSMENT',
  REHAB = 'REHAB',
  ANALYTICS = 'ANALYTICS',
  SETTINGS = 'SETTINGS'
}

export enum RehabMode {
  DEMO = 'DEMO',
  REAL = 'REAL'
}

export interface Point {
  x: number;
  y: number;
}

export interface EyeLandmarks {
  pupil: Point;
  upperLid: Point;
  lowerLid: Point;
  innerCorner: Point;
  outerCorner: Point;
}

export interface FaceData {
  yaw: number;
  pitch: number;
  roll: number;
  eyeOpennessLeft: number; // 0.0 to 1.0
  eyeOpennessRight: number;
  mouthSymmetry: number; // 0.0 (asymmetric) to 1.0 (symmetric)
  gazeX: number; // -1 to 1
  gazeY: number; // -1 to 1
  blinkDetected: boolean;
  confidence: number;
  // Raw landmarks for visualization
  leftEye?: EyeLandmarks;
  rightEye?: EyeLandmarks;
}

export interface AssessmentResult {
  id: string;
  date: string;
  eyeControlScore: number;
  faceSymmetryScore: number;
  headMobilityScore: number;
  overallScore: number;
  status: 'Complete' | 'Incomplete';
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  category: 'EYE' | 'FACE' | 'HEAD';
  durationSeconds: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface DailyProgress {
  day: string;
  score: number;
  compliance: number;
}

export interface PatientDetails {
  name: string;
  id: string;
  age: string;
  gender: string;
  condition: string;
  doctorName?: string;
  dateOfBirth?: string;
}

export interface SessionAnalysis {
  exerciseType: string;
  duration: number;
  score: number;
  clinicalValue: number;
  clinicalUnit: string;
  status: 'GOOD' | 'WARNING' | 'CRITICAL';
  recommendation: string;
  notes: string[];
}
