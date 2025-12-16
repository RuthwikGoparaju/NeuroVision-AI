
import React, { useState } from 'react';
import { AppView, RehabMode, DailyProgress, PatientDetails } from './types';
import Assessment from './components/Assessment';
import Dashboard from './components/Dashboard';
import RehabExercise from './components/RehabExercise';
import { Activity, Home, Settings, User, AlertTriangle, ShieldCheck, Check, Info, FileText, UserPlus, Stethoscope, PlayCircle } from 'lucide-react';

// Mock Data
const MOCK_HISTORY: DailyProgress[] = [
  { day: 'Mon', score: 65, compliance: 80 },
  { day: 'Tue', score: 68, compliance: 90 },
  { day: 'Wed', score: 72, compliance: 100 },
  { day: 'Thu', score: 70, compliance: 85 },
  { day: 'Fri', score: 75, compliance: 95 },
  { day: 'Sat', score: 78, compliance: 100 },
  { day: 'Sun', score: 82, compliance: 100 },
];

const DEFAULT_PATIENT: PatientDetails = {
    name: '',
    id: '',
    age: '',
    gender: 'Male',
    condition: '',
    doctorName: 'Ruthwik Goparaju'
};

function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [rehabMode, setRehabMode] = useState<RehabMode>(RehabMode.DEMO);
  const [consentGiven, setConsentGiven] = useState(false);
  
  // Session State
  const [activeExercise, setActiveExercise] = useState<'FOLLOW_DOT' | 'BLINK_TRAINING' | 'HEAD_STABILITY'>('FOLLOW_DOT');
  const [sessionType, setSessionType] = useState<'ASSESSMENT' | 'EXERCISE'>('EXERCISE');
  
  // Patient Intake State
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<PatientDetails>(DEFAULT_PATIENT);
  const [tempPatientForm, setTempPatientForm] = useState<PatientDetails>(DEFAULT_PATIENT);
  
  // Simulation Profile (kept as a setting within the patient form for demo purposes)
  const [selectedDemoProfile, setSelectedDemoProfile] = useState<'HEALTHY' | 'LOW' | 'HIGH'>('HEALTHY');

  const handleAssessmentComplete = (score: number) => {
    setCurrentView(AppView.ANALYTICS);
  };

  const initiateSession = (type: 'ASSESSMENT' | 'EXERCISE', exerciseType?: 'FOLLOW_DOT' | 'BLINK_TRAINING' | 'HEAD_STABILITY') => {
    setSessionType(type);
    if (exerciseType) setActiveExercise(exerciseType);
    
    // Reset form and open modal
    setTempPatientForm(DEFAULT_PATIENT);
    setPatientModalOpen(true);
  };

  const handleStartSession = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (rehabMode === RehabMode.DEMO) {
          // In Demo mode, auto-fill generic details
          setCurrentPatient({
              name: 'Demo Patient',
              id: 'DEMO-001',
              age: 'N/A',
              gender: 'N/A',
              condition: 'Simulation Mode',
              doctorName: tempPatientForm.doctorName || 'Ruthwik Goparaju'
          });
      } else {
          // In Real mode, use the form data
          setCurrentPatient({
              name: tempPatientForm.name || 'Anonymous Patient',
              id: tempPatientForm.id || `P-${Math.floor(Math.random()*10000)}`,
              age: tempPatientForm.age || 'N/A',
              gender: tempPatientForm.gender || 'Not Specified',
              condition: tempPatientForm.condition || 'General Assessment',
              doctorName: tempPatientForm.doctorName || 'Ruthwik Goparaju'
          });
      }

      setPatientModalOpen(false);
      
      if (sessionType === 'ASSESSMENT') {
          setCurrentView(AppView.ASSESSMENT);
      } else {
          setCurrentView(AppView.REHAB);
      }
  };

  if (!consentGiven) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
                  <div className="flex justify-center mb-6">
                      <div className="bg-medical-100 p-4 rounded-full">
                          <ShieldCheck className="w-12 h-12 text-medical-600" />
                      </div>
                  </div>
                  <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">NeuroVision AI</h1>
                  <p className="text-center text-slate-500 mb-6">Clinical-Grade Rehabilitation Platform</p>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                      <h3 className="text-amber-800 font-bold text-sm mb-1 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> 
                          Medical Disclaimer
                      </h3>
                      <p className="text-amber-700 text-xs leading-relaxed">
                          This application is a support tool and <strong>does not replace professional medical diagnosis</strong>. 
                          Always consult your doctor before starting new rehabilitation exercises.
                      </p>
                  </div>

                  <div className="space-y-4 mb-6">
                      <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                          <input type="checkbox" className="mt-1" />
                          <span className="text-sm text-slate-600">I allow camera access for local processing (no facial data is stored on servers).</span>
                      </label>
                      <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                          <input type="checkbox" className="mt-1" />
                          <span className="text-sm text-slate-600">I understand this is a technical demonstration/pilot.</span>
                      </label>
                  </div>

                  <button 
                    onClick={() => setConsentGiven(true)}
                    className="w-full bg-medical-600 text-white py-3 rounded-xl font-bold hover:bg-medical-700 transition-colors shadow-lg shadow-medical-500/30"
                  >
                      Accept & Continue
                  </button>
                  <p className="text-center text-[10px] text-slate-400 mt-6">
                      Created by Ruthwik Goparaju
                  </p>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 md:pb-0 md:pl-24 relative">
      {/* Mobile Navigation (Bottom) */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 md:hidden z-50 flex items-center justify-around pb-2">
        <NavButton icon={Home} label="Home" active={currentView === AppView.HOME} onClick={() => setCurrentView(AppView.HOME)} />
        <NavButton icon={Activity} label="Analytics" active={currentView === AppView.ANALYTICS} onClick={() => setCurrentView(AppView.ANALYTICS)} />
        <NavButton icon={User} label="Profile" active={currentView === AppView.SETTINGS} onClick={() => setCurrentView(AppView.SETTINGS)} />
      </nav>

      {/* Desktop Navigation (Left Sidebar) */}
      <nav className="hidden md:flex fixed top-0 left-0 bottom-0 w-24 bg-white border-r border-slate-200 flex-col items-center py-8 z-50">
        <div className="mb-12">
            <div className="w-10 h-10 bg-medical-600 rounded-lg flex items-center justify-center text-white font-bold">NV</div>
        </div>
        <div className="flex flex-col gap-8 w-full">
            <NavButtonDesktop icon={Home} label="Home" active={currentView === AppView.HOME} onClick={() => setCurrentView(AppView.HOME)} />
            <NavButtonDesktop icon={Activity} label="Analytics" active={currentView === AppView.ANALYTICS} onClick={() => setCurrentView(AppView.ANALYTICS)} />
            <NavButtonDesktop icon={User} label="Profile" active={currentView === AppView.SETTINGS} onClick={() => setCurrentView(AppView.SETTINGS)} />
        </div>
        <div className="mt-auto mb-4 flex flex-col items-center gap-1">
             <div className="text-[10px] text-slate-400 text-center font-mono">v1.1.0</div>
             <div className="text-[8px] text-slate-300 text-center font-medium px-2 leading-tight">
                Created by<br/>Ruthwik Goparaju
             </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        
        {/* Header Bar */}
        <header className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    {currentView === AppView.HOME && "Welcome"}
                    {currentView === AppView.ANALYTICS && "Clinical Dashboard"}
                    {currentView === AppView.ASSESSMENT && "Live Assessment"}
                    {currentView === AppView.REHAB && "Therapy Session"}
                </h1>
                {currentPatient.name && currentView !== AppView.HOME && (
                   <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <p className="text-slate-500 text-sm font-medium">Patient: {currentPatient.name}</p>
                   </div>
                )}
                <p className="text-slate-500 text-xs mt-1">NeuroVision AI Pilot • Created by Ruthwik Goparaju</p>
            </div>
            
            {/* Mode Toggle */}
            <div className="flex bg-white rounded-full p-1 border border-slate-200 shadow-sm">
                <button 
                    onClick={() => setRehabMode(RehabMode.DEMO)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${rehabMode === RehabMode.DEMO ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    DEMO
                </button>
                <button 
                    onClick={() => setRehabMode(RehabMode.REAL)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${rehabMode === RehabMode.REAL ? 'bg-medical-100 text-medical-700' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    REAL SCAN
                </button>
            </div>
        </header>

        {/* View Routing */}
        {currentView === AppView.HOME && (
            <div className="space-y-6">
                {/* Hero Card */}
                <div className="bg-gradient-to-br from-medical-600 to-medical-800 rounded-3xl p-8 text-white shadow-xl shadow-medical-900/20 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-medium mb-4 backdrop-blur-sm">New Session</div>
                        <h2 className="text-3xl font-bold mb-2">Start Patient Screening</h2>
                        <p className="text-medical-100 mb-8 max-w-md">Perform a full neuro-ophthalmic assessment or select specific rehabilitation exercises.</p>
                        
                        <div className="flex gap-4">
                            <button 
                                onClick={() => initiateSession('ASSESSMENT')}
                                className="px-6 py-3 bg-white text-medical-700 font-bold rounded-xl shadow-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                            >
                                <Stethoscope className="w-5 h-5" />
                                Start Assessment
                            </button>
                            <button 
                                onClick={() => initiateSession('EXERCISE', 'FOLLOW_DOT')}
                                className="px-6 py-3 bg-medical-700 text-white font-bold rounded-xl hover:bg-medical-600 transition-colors border border-medical-500"
                            >
                                Quick Exercise
                            </button>
                        </div>
                    </div>
                    {/* Abstract Shapes */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
                </div>

                {/* Modules Grid */}
                <h3 className="text-lg font-bold text-slate-800 mt-8">Training Modules</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ModuleCard 
                        title="Oculomotor" 
                        desc="Tracking & Gaze Stability" 
                        color="bg-emerald-50 text-emerald-700" 
                        onClick={() => initiateSession('EXERCISE', 'FOLLOW_DOT')}
                    />
                    <ModuleCard 
                        title="Blink Training" 
                        desc="Reflex & Dry Eye Therapy" 
                        color="bg-purple-50 text-purple-700" 
                        onClick={() => initiateSession('EXERCISE', 'BLINK_TRAINING')}
                    />
                    <ModuleCard 
                        title="Vestibular" 
                        desc="Head Motion & Balance" 
                        color="bg-blue-50 text-blue-700" 
                        onClick={() => initiateSession('EXERCISE', 'HEAD_STABILITY')}
                    />
                </div>
            </div>
        )}

        {currentView === AppView.ASSESSMENT && (
            <div className="h-[600px]">
                <Assessment 
                    mode={rehabMode} 
                    onComplete={handleAssessmentComplete} 
                    onCancel={() => setCurrentView(AppView.HOME)} 
                />
            </div>
        )}

        {currentView === AppView.REHAB && (
            <div className="h-[600px]">
                <RehabExercise 
                    mode={rehabMode}
                    exerciseType={activeExercise}
                    durationSeconds={60}
                    onExit={() => setCurrentView(AppView.HOME)}
                    demoProfile={selectedDemoProfile}
                    patientDetails={currentPatient}
                />
            </div>
        )}

        {currentView === AppView.ANALYTICS && (
            <Dashboard history={MOCK_HISTORY} patientDetails={currentPatient} />
        )}

        {currentView === AppView.SETTINGS && (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
                <div className="w-20 h-20 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">👤</div>
                <h2 className="text-2xl font-bold text-slate-800">Admin Console</h2>
                <p className="text-slate-500 mb-8">System ID: #SYS-8392</p>
                <div className="max-w-xs mx-auto space-y-4">
                    <button className="w-full py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Notifications</button>
                    <button className="w-full py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Data Privacy</button>
                    <button className="w-full py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100">Log Out</button>
                </div>
            </div>
        )}
      
      {/* Patient Intake Modal */}
      {patientModalOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${rehabMode === RehabMode.DEMO ? 'bg-amber-100 text-amber-700' : 'bg-medical-100 text-medical-700'}`}>
                              {rehabMode === RehabMode.DEMO ? <PlayCircle className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-800">
                                {rehabMode === RehabMode.DEMO ? 'Start Simulation' : (sessionType === 'ASSESSMENT' ? 'New Assessment' : 'New Rehab Session')}
                            </h3>
                            <p className="text-xs text-slate-500">
                                {rehabMode === RehabMode.DEMO ? 'Select a profile to simulate' : 'Enter patient details'}
                            </p>
                          </div>
                      </div>
                      {sessionType === 'EXERCISE' && (
                        <div className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded border border-blue-100 uppercase">
                            {activeExercise.replace('_', ' ')}
                        </div>
                      )}
                  </div>
                  
                  <form onSubmit={handleStartSession} className="p-6 grid gap-4">
                      
                      {rehabMode === RehabMode.REAL ? (
                          /* REAL MODE: Show Patient Form */
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Patient Name</label>
                               <input 
                                  type="text" 
                                  required
                                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-medical-500 focus:ring-1 focus:ring-medical-500"
                                  placeholder="e.g. John Doe"
                                  value={tempPatientForm.name}
                                  onChange={e => setTempPatientForm({...tempPatientForm, name: e.target.value})}
                               />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gender</label>
                               <select 
                                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-medical-500"
                                  value={tempPatientForm.gender}
                                  onChange={e => setTempPatientForm({...tempPatientForm, gender: e.target.value})}
                               >
                                   <option value="Male">Male</option>
                                   <option value="Female">Female</option>
                                   <option value="Other">Other</option>
                                   <option value="Prefer not to say">Prefer not to say</option>
                               </select>
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Age</label>
                               <input 
                                  type="number" 
                                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-medical-500"
                                  placeholder="e.g. 45"
                                  value={tempPatientForm.age}
                                  onChange={e => setTempPatientForm({...tempPatientForm, age: e.target.value})}
                               />
                            </div>
                            <div className="col-span-2">
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Attending Clinician / Doctor</label>
                               <input 
                                  type="text" 
                                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-medical-500"
                                  placeholder="e.g. Ruthwik Goparaju"
                                  value={tempPatientForm.doctorName}
                                  onChange={e => setTempPatientForm({...tempPatientForm, doctorName: e.target.value})}
                               />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Patient ID (Optional)</label>
                               <input 
                                  type="text" 
                                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-medical-500"
                                  placeholder="e.g. #88392"
                                  value={tempPatientForm.id}
                                  onChange={e => setTempPatientForm({...tempPatientForm, id: e.target.value})}
                               />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Diagnosis</label>
                               <input 
                                  type="text" 
                                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-medical-500"
                                  placeholder="e.g. Stroke / Concussion"
                                  value={tempPatientForm.condition}
                                  onChange={e => setTempPatientForm({...tempPatientForm, condition: e.target.value})}
                               />
                            </div>
                          </div>
                      ) : (
                          /* DEMO MODE: Show Simulation Selector Only */
                          <div className="space-y-4">
                              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                  <p className="text-sm text-amber-900 font-bold mb-1">Simulation Mode Active</p>
                                  <p className="text-xs text-amber-700 leading-relaxed">
                                    Patient details are bypassed in demo mode. Select a clinical profile below to simulate specific neurological conditions without a live patient.
                                  </p>
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                      Select Clinical Profile
                                  </label>
                                  <div className="space-y-2">
                                      {['HEALTHY', 'LOW', 'HIGH'].map((profile) => (
                                          <label 
                                            key={profile}
                                            className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedDemoProfile === profile ? 'border-amber-500 bg-amber-50' : 'border-slate-100 hover:border-slate-200'}`}
                                          >
                                              <input 
                                                type="radio" 
                                                name="demoProfile"
                                                value={profile}
                                                checked={selectedDemoProfile === profile}
                                                onChange={(e: any) => setSelectedDemoProfile(e.target.value)}
                                                className="mr-3 w-4 h-4 text-amber-600 focus:ring-amber-500"
                                              />
                                              <div>
                                                  <div className="text-sm font-bold text-slate-800">
                                                      {profile === 'HEALTHY' && "Healthy / Normal Response"}
                                                      {profile === 'LOW' && "Low Function (Deficit Simulation)"}
                                                      {profile === 'HIGH' && "High Function (Excessive/Anxiety)"}
                                                  </div>
                                                  <div className="text-xs text-slate-500 mt-0.5">
                                                      {profile === 'HEALTHY' && "Standard clinical baseline."}
                                                      {profile === 'LOW' && "Simulates gaze palsy, low blink rate, & head tremors."}
                                                      {profile === 'HIGH' && "Simulates anxiety, rapid blinking, & hyper-fixation."}
                                                  </div>
                                              </div>
                                          </label>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      )}
                      
                      <div className="pt-2">
                        <button 
                            type="submit"
                            className={`w-full py-3 text-white font-bold rounded-xl transition-colors shadow-lg ${rehabMode === RehabMode.DEMO ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/30' : 'bg-medical-600 hover:bg-medical-700 shadow-medical-500/30'}`}
                        >
                            {rehabMode === RehabMode.DEMO ? 'Launch Simulation' : (sessionType === 'ASSESSMENT' ? 'Begin Screening' : 'Begin Exercise')}
                        </button>
                      </div>
                  </form>
                  <div className="bg-slate-50 p-3 text-center border-t border-slate-100">
                      <button 
                        type="button"
                        onClick={() => setPatientModalOpen(false)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                          Cancel
                      </button>
                  </div>
              </div>
          </div>
      )}

      </main>
    </div>
  );
}

// Sub-components for UI
const NavButton = ({ icon: Icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 ${active ? 'text-medical-600' : 'text-slate-400'}`}>
        <Icon className={`w-6 h-6 ${active ? 'fill-current opacity-20' : ''}`} strokeWidth={active ? 2.5 : 2} />
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);

const NavButtonDesktop = ({ icon: Icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`w-full flex flex-col items-center gap-1 py-3 border-l-4 transition-all ${active ? 'border-medical-600 text-medical-600 bg-medical-50' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
        <Icon className="w-6 h-6" />
        <span className="text-xs font-medium">{label}</span>
    </button>
);

const ModuleCard = ({ title, desc, color, onClick }: any) => (
    <button onClick={onClick} className={`p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-all text-left group bg-white`}>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
            <Activity className="w-6 h-6" />
        </div>
        <h4 className="text-lg font-bold text-slate-800 mb-1">{title}</h4>
        <p className="text-sm text-slate-400">{desc}</p>
    </button>
);

export default App;
