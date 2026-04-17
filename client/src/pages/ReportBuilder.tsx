import { useState } from 'react';
import { generateReport, downloadReport } from '../services/api';
import type { ReportFormat, ReportType } from '../types';
import DateRangePicker from '../components/DateRangePicker';
import FormatSelector from '../components/FormatSelector';
import ReportsSubnav from '../components/ReportsSubnav';

const REPORT_TYPES: Array<{ value: ReportType; label: string; description: string }> = [
  { value: 'executive_summary', label: 'Executive Summary', description: 'KPI overview + anomaly count across all selected departments' },
  { value: 'compliance', label: 'Compliance Report', description: 'Detailed compliance rates and violation breakdown' },
  { value: 'anomaly', label: 'Anomaly Report', description: 'All anomalies detected by Isolation Forest with feature values' },
  { value: 'risk', label: 'Risk Report', description: 'Risk scores per department from Random Forest model' },
];

const DEPARTMENTS = ['FI001', 'HR001', 'OPS001', 'LEGAL001', 'IT001'];

// Get today's date and 90 days ago as default range
const today = new Date().toISOString().split('T')[0];
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

export default function ReportBuilder() {
  // Form state
  const [reportType, setReportType] = useState<ReportType>('executive_summary');
  const [dateFrom, setDateFrom] = useState(ninetyDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]); // Empty = all depts
  const [format, setFormat] = useState<ReportFormat>('csv');

  // UI state
  const [loading, setLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Toggle a department in/out of the selected list
  function toggleDept(dept: string) {
    setSelectedDepts((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
    // Reset any previous generation result when config changes
    setGeneratedId(null);
    setSuccess(false);
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setGeneratedId(null);
    setSuccess(false);

    try {
      const result = await generateReport({
        type: reportType,
        format,
        dateFrom,
        dateTo,
        departments: selectedDepts,
      });

      setGeneratedId(result.reportId);
      setSuccess(true);
      console.log('[ReportBuilder] Report generated:', result.reportId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Report generation failed. Check the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!generatedId) return;
    const ext = format === 'excel' ? 'xlsx' : format;
    await downloadReport(generatedId, `govvision-report-${reportType}.${ext}`);
  }

  return (
    <div className="p-6 max-w-3xl space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Report Builder</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure and generate governance reports in CSV, Excel, or PDF format.
        </p>
      </div>

      <ReportsSubnav />

      {/* Section 1: Report Type */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800">1. Report Type</h2>
        <div className="grid grid-cols-2 gap-3">
          {REPORT_TYPES.map((rt) => (
            <label
              key={rt.value}
              className={`cursor-pointer border rounded-xl p-4 transition-all ${
                reportType === rt.value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="radio"
                  name="reportType"
                  value={rt.value}
                  checked={reportType === rt.value}
                  onChange={() => { setReportType(rt.value); setGeneratedId(null); }}
                  className="accent-indigo-600"
                />
                <span className="font-semibold text-sm text-gray-800">{rt.label}</span>
              </div>
              <p className="text-xs text-gray-500 ml-5">{rt.description}</p>
            </label>
          ))}
        </div>
      </div>

      {/* Section 2: Date Range */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800">2. Date Range</h2>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onFromChange={setDateFrom}
          onToChange={setDateTo}
        />
      </div>

      {/* Section 3: Departments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">3. Departments</h2>
          <span className="text-xs text-gray-400">
            {selectedDepts.length === 0 ? 'All departments selected' : `${selectedDepts.length} selected`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              onClick={() => toggleDept(dept)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selectedDepts.includes(dept)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">Leave all unselected to include all departments in the report.</p>
      </div>

      {/* Section 4: Format */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800">4. Output Format</h2>
        <FormatSelector selected={format} onChange={(f) => { setFormat(f); setGeneratedId(null); }} />
      </div>

      {/* Section 5: Generate */}
      <div className="space-y-4 border-t pt-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && generatedId && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-green-800 font-semibold text-sm">Report generated successfully</p>
              <p className="text-green-600 text-xs mt-0.5">Click Download to save the file</p>
            </div>
            <button
              onClick={handleDownload}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              ↓ Download {format.toUpperCase()}
            </button>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin">⟳</span>
              Generating report...
            </>
          ) : (
            'Generate Report'
          )}
        </button>
      </div>
    </div>
  );
}
