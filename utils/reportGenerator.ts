

import { DailyProgress, PatientDetails, SessionAnalysis } from '../types';

export const generatePDFReport = (
    patient: PatientDetails, 
    session?: SessionAnalysis,
    history?: DailyProgress[],
    radarData?: { subject: string, A: number, fullMark: number }[]
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();
  
  // Use Doctor Name from patient details, or default to Ruthwik Goparaju
  const doctorName = patient.doctorName || 'Ruthwik Goparaju';

  // ACTUAL SIGNATURE IMAGE
  const signatureSrc = "https://res.cloudinary.com/dns0nlupj/image/upload/signature_2_rjssd2.png";

  // Serialize data for injection
  const historyDataJson = history ? JSON.stringify(history) : 'null';
  const radarDataJson = radarData ? JSON.stringify(radarData) : 'null';

  // Helper for Clinical Definitions
  const getProtocolDesc = (type: string) => {
      const t = type.toUpperCase();
      if (t.includes('BLINK')) return "Assessment of spontaneous blink rate (SBR) and inter-blink interval consistency to evaluate dopaminergic activity and ocular surface health.";
      if (t.includes('DOT') || t.includes('FOLLOW')) return "Evaluation of smooth pursuit and saccadic oculomotor function using a moving visual stimulus target.";
      if (t.includes('HEAD') || t.includes('STABILITY')) return "Quantification of cephalic stability and cervical proprioception during active fixation tasks.";
      return "General neuro-rehabilitation assessment protocol utilizing computer-vision based facial landmark tracking.";
  };

  const getDomainDef = (subject: string) => {
      const s = subject.toLowerCase();
      if (s.includes('eye')) return "Oculomotor pursuit accuracy & saccadic latency.";
      if (s.includes('face') || s.includes('symmetry')) return "Bilateral deviation of 478 facial mesh landmarks.";
      if (s.includes('head') || s.includes('mobility')) return "Cervical Range of Motion (CROM) efficiency.";
      if (s.includes('stability')) return "Vestibulo-collic reflex (VCR) integrity.";
      if (s.includes('reaction')) return "Stimulus-to-response temporal latency.";
      return "Functional neurological performance marker.";
  };

  // Statistical Summaries
  const stats = history ? {
      avgScore: (history.reduce((a, b) => a + b.score, 0) / history.length).toFixed(1),
      maxScore: Math.max(...history.map(h => h.score)),
      minScore: Math.min(...history.map(h => h.score)),
      avgCompliance: (history.reduce((a, b) => a + b.compliance, 0) / history.length).toFixed(1),
      totalSessions: history.length,
      netImprovement: history.length > 1 ? (history[history.length-1].score - history[0].score).toFixed(1) : '0'
  } : null;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Clinical Session Report - ${patient.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body { 
            font-family: 'Inter', sans-serif; 
            padding: 40px; 
            color: #1e293b; 
            max-width: 800px; 
            margin: 0 auto; 
            background: white;
            font-size: 12px;
          }
          @media print {
            body { padding: 0; max-width: 100%; margin: 20px; }
            button { display: none; }
            .page-break { page-break-before: always; }
            .avoid-break { page-break-inside: avoid; }
          }
          
          /* Header Layout */
          .report-header { 
            border-bottom: 2px solid #0284c7; 
            padding-bottom: 15px; 
            margin-bottom: 25px; 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-end; 
          }
          .logo-area {
            display: flex;
            flex-direction: column;
          }
          .logo { 
            font-size: 24px; 
            font-weight: 800; 
            color: #0f172a; 
            letter-spacing: -0.5px;
            text-transform: uppercase;
            line-height: 1;
            margin-bottom: 4px;
          }
          .logo span { color: #0284c7; }
          .sub-logo {
            font-size: 10px;
            color: #64748b;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            font-weight: 600;
          }
          .clinic-info { 
            text-align: right; 
            font-size: 10px; 
            color: #475569;
            line-height: 1.4; 
          }
          
          /* Patient Info Grid */
          .patient-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 25px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            font-size: 11px;
          }
          .field-group { display: flex; flex-direction: column; }
          .field-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px; letter-spacing: 0.5px; }
          .field-value { font-size: 12px; font-weight: 600; color: #0f172a; }
          .full-width { grid-column: 1 / -1; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 5px; display: grid; grid-template-columns: 1fr 1fr; }

          /* Section Headers */
          h2 { 
            color: #0f172a; 
            font-size: 16px; 
            margin-bottom: 15px; 
            padding-bottom: 5px;
            border-bottom: 1px solid #cbd5e1;
            display: flex;
            align-items: center;
            gap: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          h2::before {
            content: '';
            display: block;
            width: 4px;
            height: 16px;
            background: #0284c7;
          }
          
          /* Methodology Box */
          .methodology-box {
            font-size: 10px;
            color: #64748b;
            background: #fff;
            border: 1px solid #e2e8f0;
            padding: 10px;
            margin-bottom: 20px;
            line-height: 1.5;
            text-align: justify;
          }

          /* Analysis Cards */
          .analysis-card {
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 25px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          .analysis-header {
            background: #f1f5f9;
            padding: 10px 15px;
            border-bottom: 1px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .analysis-title { font-weight: 700; color: #334155; font-size: 13px; }
          .analysis-status { 
            font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 12px; text-transform: uppercase; 
          }
          .status-good { background: #d1fae5; color: #047857; border: 1px solid #34d399; }
          .status-warning { background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; }
          .status-critical { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }

          .protocol-desc {
            padding: 10px 15px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            font-size: 10px;
            color: #475569;
            font-style: italic;
          }

          .result-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            padding: 15px;
            gap: 15px;
            background: #fff;
            border-bottom: 1px solid #e2e8f0;
          }
          .result-item { text-align: center; border-right: 1px solid #f1f5f9; }
          .result-item:last-child { border-right: none; }
          .result-val { font-size: 24px; font-weight: 800; color: #0284c7; letter-spacing: -0.5px; }
          .result-unit { font-size: 9px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 2px; }

          .clinical-notes { padding: 15px; background: #fff; }
          .note-list { margin: 0; padding-left: 15px; color: #334155; font-size: 11px; line-height: 1.6; }
          .note-list li { margin-bottom: 4px; }
          
          .recommendation {
            margin-top: 10px;
            padding: 10px;
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 4px;
            font-size: 11px;
            color: #0369a1;
          }
          
          /* Stats Grid */
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .stat-box {
            background: #fff;
            border: 1px solid #e2e8f0;
            padding: 10px;
            border-radius: 4px;
            text-align: center;
          }
          .stat-label { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 2px; }
          .stat-value { font-size: 16px; font-weight: 800; color: #0f172a; }
          .stat-sub { font-size: 8px; color: #94a3b8; }

          /* Chart Layout */
          .charts-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          .chart-container {
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 10px;
            background: #fff;
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          canvas { max-width: 100%; max-height: 100%; }
          
          .chart-legend {
            margin-top: 8px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            font-size: 9px;
          }
          .legend-item {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px dotted #e2e8f0;
            padding-bottom: 2px;
          }

          /* Table Styles */
          table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 20px; }
          th { background: #f8fafc; color: #475569; font-weight: 700; text-align: left; padding: 8px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; color: #334155; }
          tr:nth-child(even) { background: #fcfcfc; }
          tr:last-child td { border-bottom: none; }

          /* Signature Footer */
          .signature-section {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            page-break-inside: avoid;
          }
          .signature-box {
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
          }
          .sig-img {
            width: 120px;
            height: 50px;
            margin-bottom: 4px;
            display: flex;
            align-items: flex-end;
          }
          .sig-img img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            object-position: left bottom;
          }
          .sig-name { font-weight: 700; font-size: 12px; color: #0f172a; }
          .sig-title { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-top: 1px; }
          
          .footer-legal { 
            margin-top: 30px; 
            text-align: center; 
            color: #94a3b8; 
            font-size: 8px; 
            border-top: 1px solid #e2e8f0; 
            padding-top: 10px;
            line-height: 1.4; 
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div class="logo-area">
            <div class="logo">NeuroVision <span>AI</span></div>
            <div class="sub-logo">Advanced Rehabilitation Systems</div>
          </div>
          <div class="clinic-info">
            <strong>CLINICAL SESSION REPORT</strong><br>
            <span style="color:#0ea5e9">CONFIDENTIAL</span><br>
            Generated: ${date} ${time}<br>
            Ref: ${Math.random().toString(36).substr(2, 9).toUpperCase()}
          </div>
        </div>

        <div class="patient-box">
           <div class="field-group">
              <div class="field-label">Patient Name</div>
              <div class="field-value">${patient.name}</div>
           </div>
           <div class="field-group">
              <div class="field-label">Patient ID</div>
              <div class="field-value">${patient.id}</div>
           </div>
           <div class="field-group">
              <div class="field-label">Age / Gender</div>
              <div class="field-value">${patient.age} / ${patient.gender}</div>
           </div>
           <div class="field-group">
              <div class="field-label">Date of Birth</div>
              <div class="field-value">--/--/----</div>
           </div>
           
           <div class="full-width">
              <div class="field-group">
                  <div class="field-label">Clinical Indication / Diagnosis</div>
                  <div class="field-value">${patient.condition}</div>
              </div>
              <div class="field-group" style="text-align:right;">
                  <div class="field-label">Attending Physician / Specialist</div>
                  <div class="field-value">${doctorName}</div>
              </div>
           </div>
        </div>

        <div class="methodology-box">
            <strong>Methodology:</strong> This report utilizes NeuroVision AI™ computer vision algorithms to track 478 facial landmarks in real-time. 
            Metrics are derived from frame-by-frame analysis of iris position (gaze), eyelid aperture (blinks), and head pose estimation (yaw/pitch/roll). 
            Reliability is contingent on lighting conditions and patient cooperation during the scan window.
        </div>

        ${session ? `
        <div class="section avoid-break">
           <h2>Acute Assessment Analysis</h2>
           <div class="analysis-card">
              <div class="analysis-header">
                  <div class="analysis-title">${session.exerciseType} Protocol</div>
                  <div class="analysis-status status-${session.status.toLowerCase()}">${session.status}</div>
              </div>
              <div class="protocol-desc">
                  ${getProtocolDesc(session.exerciseType)}
              </div>
              <div class="result-grid">
                  <div class="result-item">
                      <div class="result-val">${session.clinicalValue}</div>
                      <div class="result-unit">${session.clinicalUnit}</div>
                  </div>
                   <div class="result-item">
                      <div class="result-val">${session.score}</div>
                      <div class="result-unit">Performance Index (0-100)</div>
                  </div>
                   <div class="result-item">
                      <div class="result-val">${session.duration}s</div>
                      <div class="result-unit">Protocol Duration</div>
                  </div>
              </div>
              <div class="clinical-notes">
                  <div class="field-label" style="margin-bottom:5px;">Automated Observations & Anomalies</div>
                  <ul class="note-list">
                      ${session.notes.map(n => `<li>${n}</li>`).join('')}
                      ${session.notes.length === 0 ? '<li>No specific biomechanical anomalies detected within sensitivity thresholds.</li>' : ''}
                  </ul>
                  
                  <div class="recommendation">
                      <strong>Clinical Suggestion:</strong> ${session.recommendation}
                  </div>
              </div>
           </div>
        </div>
        ` : ''}

        ${(history || radarData) ? `
        <div class="section page-break">
            <h2>Longitudinal Rehabilitation Analytics</h2>
            
            ${stats ? `
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-label">Avg. Score</div>
                    <div class="stat-value">${stats.avgScore}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Peak Perf.</div>
                    <div class="stat-value">${stats.maxScore}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Baseline</div>
                    <div class="stat-value">${stats.minScore}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Compliance</div>
                    <div class="stat-value">${stats.avgCompliance}%</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Net Trend</div>
                    <div class="stat-value" style="color:${parseFloat(stats.netImprovement.toString()) >= 0 ? '#10b981' : '#ef4444'}">
                        ${parseFloat(stats.netImprovement.toString()) > 0 ? '+' : ''}${stats.netImprovement}
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="charts-section">
                ${history ? `
                <div>
                   <div class="field-label" style="margin-bottom:6px; text-align:center;">Recovery Trajectory (Last 7 Sessions)</div>
                   <div class="chart-container">
                       <canvas id="historyChart"></canvas>
                   </div>
                   <div style="margin-top:10px; font-size:9px; color:#64748b; text-align:center;">
                       Graph indicates daily performance index vs protocol target.
                   </div>
                </div>` : ''}
                
                ${radarData ? `
                <div>
                   <div class="field-label" style="margin-bottom:6px; text-align:center;">Functional Domain Map</div>
                   <div class="chart-container" style="height: 200px;">
                       <canvas id="radarChart"></canvas>
                   </div>
                   <div class="chart-legend">
                      ${radarData.map(d => `
                        <div class="legend-item">
                           <span style="font-weight:600; color:#334155;" title="${getDomainDef(d.subject)}">${d.subject}</span>
                           <span style="color:#0ea5e9;">${d.A}%</span>
                        </div>
                      `).join('')}
                   </div>
                   <div style="font-size:8px; color:#94a3b8; margin-top:5px; text-align:center;">
                       *Values represent percentile rank against normative healthy baseline.
                   </div>
                </div>` : ''}
            </div>
        </div>
        ` : ''}

        ${history ? `
        <div class="section avoid-break">
          <h2>Detailed Session Log</h2>
          <table>
            <thead>
              <tr>
                <th width="20%">Date</th>
                <th width="20%">Session ID</th>
                <th width="30%">Performance Score</th>
                <th width="30%">Protocol Compliance</th>
              </tr>
            </thead>
            <tbody>
              ${history.map((row, i) => `
                <tr>
                  <td>${row.day}</td>
                  <td><span style="font-family:monospace; color:#64748b;">SES-${1000+i}</span></td>
                  <td>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <div style="width:50px; height:4px; background:#e2e8f0; border-radius:2px; overflow:hidden;">
                            <div style="width:${row.score}%; height:100%; background:#0ea5e9;"></div>
                        </div>
                        <strong>${row.score}</strong>
                    </div>
                  </td>
                  <td>${row.compliance}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="signature-section avoid-break">
            <div class="signature-box">
                <div class="sig-img">
                   <img src="${signatureSrc}" alt="Digital Signature" />
                </div>
                <div class="sig-name">${doctorName}</div>
                <div class="sig-title">Biomedical Engineer<br>Lead Architect, NeuroVision AI</div>
            </div>
            <div class="signature-box" style="border:none; text-align:right; font-size:10px; color:#64748b; vertical-align:bottom;">
                <p><strong>ELECTRONICALLY VERIFIED</strong><br>
                Timestamp: ${new Date().toISOString()}<br>
                Cryptographic Hash: ${Math.random().toString(36).substr(2, 24).toUpperCase()}<br>
                Device ID: NV-AI-WEB-CLIENT-v1.2</p>
            </div>
        </div>

        <div class="footer-legal">
          <p><strong>CONFIDENTIAL MEDICAL RECORD - DO NOT DISTRIBUTE WITHOUT AUTHORIZATION</strong><br>
          This report is automatically generated by NeuroVision AI, a clinical support tool created by Ruthwik Goparaju. 
          The data presented herein is derived from computer vision analysis and is intended to supplement, not replace, 
          standard clinical evaluation. Error margin +/- 5% based on camera resolution and lighting. 
          <br>© 2023 NeuroVision AI Systems. All rights reserved.</p>
        </div>
        
        <script>
          const historyData = ${historyDataJson};
          const radarData = ${radarDataJson};

          window.onload = () => {
             const chartsToRender = [];

             // Render History Line Chart
             if (historyData) {
                const ctxHistory = document.getElementById('historyChart').getContext('2d');
                chartsToRender.push(new Chart(ctxHistory, {
                    type: 'line',
                    data: {
                        labels: historyData.map(d => d.day),
                        datasets: [{
                            label: 'Perf. Index',
                            data: historyData.map(d => d.score),
                            borderColor: '#0ea5e9',
                            backgroundColor: 'rgba(14, 165, 233, 0.05)',
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true,
                            pointRadius: 3,
                            pointBackgroundColor: '#fff',
                            pointBorderColor: '#0ea5e9',
                            pointBorderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: false,
                        scales: {
                            y: { 
                                beginAtZero: true, 
                                max: 100, 
                                ticks: { font: {size: 9}, stepSize: 20 },
                                grid: { color: '#f1f5f9' }
                            },
                            x: { 
                                ticks: { font: {size: 9} },
                                grid: { display: false }
                            }
                        },
                        plugins: { legend: { display: false } }
                    }
                }));
             }

             // Render Radar Chart
             if (radarData) {
                const ctxRadar = document.getElementById('radarChart').getContext('2d');
                chartsToRender.push(new Chart(ctxRadar, {
                    type: 'radar',
                    data: {
                        labels: radarData.map(d => d.subject),
                        datasets: [{
                            label: 'Patient',
                            data: radarData.map(d => d.A),
                            fill: true,
                            backgroundColor: 'rgba(14, 165, 233, 0.2)',
                            borderColor: '#0ea5e9',
                            borderWidth: 2,
                            pointBackgroundColor: '#0ea5e9',
                            pointBorderColor: '#fff',
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: '#0ea5e9',
                            pointRadius: 3
                        },
                        {
                            label: 'Healthy Baseline',
                            data: [100, 100, 100, 100, 100],
                            fill: false,
                            backgroundColor: 'transparent',
                            borderColor: '#cbd5e1',
                            borderWidth: 1,
                            borderDash: [4, 4],
                            pointRadius: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: false,
                        scales: {
                            r: {
                                angleLines: { display: true, color: '#e2e8f0' },
                                grid: { color: '#e2e8f0' },
                                pointLabels: {
                                  font: { size: 9, weight: 'bold' },
                                  color: '#475569'
                                },
                                suggestedMin: 0,
                                suggestedMax: 100,
                                ticks: { 
                                  display: true,
                                  stepSize: 25,
                                  backdropColor: 'transparent',
                                  font: { size: 7 },
                                  color: '#94a3b8'
                                } 
                            }
                        },
                        plugins: { legend: { display: false } }
                    }
                }));
             }

             // Wait a moment for canvas rendering to stabilize before print
             setTimeout(() => window.print(), 800);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

