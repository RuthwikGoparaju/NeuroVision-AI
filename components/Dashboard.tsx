
import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import { AssessmentResult, DailyProgress, PatientDetails } from '../types';
import { TrendingUp, Activity, FileText, Share2, Calendar, Download } from 'lucide-react';
import { generatePDFReport } from '../utils/reportGenerator';

interface DashboardProps {
  history: DailyProgress[];
  patientDetails: PatientDetails;
}

const Dashboard: React.FC<DashboardProps> = ({ history, patientDetails }) => {
  // Mock recent assessment for Radar chart
  const recentAssessment = [
    { subject: 'Eye Control', A: 85, fullMark: 100 },
    { subject: 'Face Symmetry', A: 92, fullMark: 100 },
    { subject: 'Head Mobility', A: 78, fullMark: 100 },
    { subject: 'Stability', A: 88, fullMark: 100 },
    { subject: 'Reaction', A: 65, fullMark: 100 },
  ];

  // Mock list of previous sessions derived from history
  const previousReports = history.map((h, i) => ({
      id: `RPT-${1000 + i}`,
      date: `${h.day}, Oct ${20 + i}`,
      type: i % 2 === 0 ? 'Full Assessment' : 'Blink Training',
      score: h.score,
      doctor: patientDetails.doctorName || 'Ruthwik Goparaju'
  })).reverse();

  const handleExport = (reportData?: any) => {
    // Use the actual patient details passed from App, fallback if empty
    const exportData = patientDetails.name ? patientDetails : {
        name: "Unknown Patient",
        id: "N/A",
        age: "N/A",
        gender: "N/A",
        condition: "N/A",
        doctorName: "Ruthwik Goparaju"
    };
    
    // Pass history AND recentAssessment data to the report generator
    // If specific report data is passed, we could customize the PDF, but for MVP we regenerate the main one
    generatePDFReport(exportData, undefined, history, recentAssessment);
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="mb-6 flex justify-between items-end">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Patient Recovery Analysis</h2>
            <p className="text-slate-500">Clinical Data & Trends for <span className="font-bold text-slate-700">{patientDetails.name || 'Current Session'}</span></p>
        </div>
      </header>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-medical-500" />
                <span className="text-sm font-medium text-slate-500">Recovery Score</span>
            </div>
            <div className="text-3xl font-bold text-slate-800">82%</div>
            <div className="text-xs text-emerald-600 font-medium">+4% this week</div>
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-slate-500">Compliance</span>
            </div>
            <div className="text-3xl font-bold text-slate-800">95%</div>
            <div className="text-xs text-slate-400">Streak: 12 days</div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 col-span-2 md:col-span-2 flex items-center justify-between">
            <div>
                <div className="text-sm font-medium text-slate-500 mb-1">Last Assessment</div>
                <div className="text-lg font-bold text-slate-800">Oct 24, 2023</div>
                <div className="text-xs text-slate-400">{patientDetails.doctorName || 'Ruthwik Goparaju'} (Approved)</div>
            </div>
            <button 
                onClick={() => handleExport()}
                className="flex items-center gap-2 px-4 py-2 bg-medical-50 text-medical-700 font-medium rounded-lg hover:bg-medical-100 transition-colors border border-medical-100"
            >
                <FileText className="w-4 h-4" />
                <span>Export Report</span>
            </button>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recovery Trend */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Recovery Trajectory</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} domain={[0, 100]} />
                        <Tooltip 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                        />
                        <Line type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4, fill: '#0ea5e9', strokeWidth: 0}} activeDot={{r: 6}} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Domain Analysis */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Functional Domain Map</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={recentAssessment}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{fill: '#64748b', fontSize: 12}} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Patient" dataKey="A" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
      
      {/* Previous Reports List */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Previous Reports</h3>
              <button className="text-xs text-medical-600 font-bold hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                      <tr>
                          <th className="px-6 py-4">Report ID</th>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Assessment Type</th>
                          <th className="px-6 py-4">Score</th>
                          <th className="px-6 py-4">Clinician</th>
                          <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {previousReports.map((report) => (
                          <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-mono text-slate-400">{report.id}</td>
                              <td className="px-6 py-4 font-medium text-slate-700 flex items-center gap-2">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {report.date}
                              </td>
                              <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${report.type === 'Full Assessment' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                      {report.type}
                                  </span>
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-700">{report.score}%</td>
                              <td className="px-6 py-4 text-slate-500">{report.doctor}</td>
                              <td className="px-6 py-4 text-right">
                                  <button 
                                    onClick={() => handleExport(report)}
                                    className="text-medical-600 hover:text-medical-800 hover:bg-medical-50 p-2 rounded-lg transition-colors"
                                    title="Download PDF"
                                  >
                                      <Download className="w-4 h-4" />
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-r from-medical-50 to-indigo-50 p-6 rounded-2xl border border-medical-100">
        <h3 className="text-medical-900 font-bold mb-2 flex items-center gap-2">
            <span className="bg-medical-500 text-white text-xs px-2 py-1 rounded">AI Insight</span>
            Clinical Note
        </h3>
        <p className="text-medical-800 text-sm leading-relaxed">
            Patient shows a <span className="font-bold">15% improvement</span> in oculomotor control specifically in the horizontal plane. 
            However, vertical saccades (up-down) show a latency of 200ms which is slightly below baseline. 
            Recommended: Increase "Vertical Pursuit" exercises.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
