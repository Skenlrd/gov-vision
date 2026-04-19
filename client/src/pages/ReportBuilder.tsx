import { useState } from "react";
import { generateReport, downloadReport } from "../services/api";
import type { ReportFormat, ReportType } from "../types";
import DateRangePicker from "../components/DateRangePicker";
import FormatSelector from "../components/FormatSelector";
import ReportsSubnav from "../components/ReportsSubnav";

const REPORT_TYPES: Array<{
  value: ReportType;
  label: string;
  description: string;
}> = [
  {
    value: "executive_summary",
    label: "Executive Summary",
    description: "KPI overview + anomaly count across all selected departments",
  },
  {
    value: "compliance",
    label: "Compliance Report",
    description: "Detailed compliance rates and violation breakdown",
  },
  {
    value: "anomaly",
    label: "Anomaly Report",
    description: "All detected anomalies with explicit feature values",
  },
  {
    value: "risk",
    label: "Risk Report",
    description: "Predictive risk scoring per department based on historical data",
  },
];

const DEPARTMENTS = [
  "Finance",
  "Human Resources",
  "Operations",
  "Information Technology",
  "Customer Service"
];

// Get today's date and 90 days ago as default range
const today = new Date().toISOString().split("T")[0];
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

export default function ReportBuilder() {
  // Form state
  const [reportType, setReportType] = useState<ReportType>("executive_summary");
  const [dateFrom, setDateFrom] = useState(ninetyDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]); // Empty = all depts
  const [format, setFormat] = useState<ReportFormat>("csv");

  // UI state
  const [loading, setLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Toggle a department in/out of the selected list
  function toggleDept(dept: string) {
    setSelectedDepts((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept],
    );
    // Reset any previous generation result when config changes
    setGeneratedId(null);
    setSuccess(false);
  }

  function applyPreset(val: string) {
    if (!val) return;
    setGeneratedId(null);
    setSuccess(false);
    
    if (val === "all") {
      setDateFrom("2024-01-01");
      setDateTo(new Date().toISOString().split("T")[0]);
      return;
    }
    if (val === "2025") {
      setDateFrom("2025-01-01");
      setDateTo("2025-12-31");
      return;
    }
    const days = parseInt(val, 10);
    const todayObj = new Date();
    const todayStr = todayObj.toISOString().split("T")[0];
    const from = new Date();
    from.setDate(todayObj.getDate() - days);
    setDateFrom(from.toISOString().split("T")[0]);
    setDateTo(todayStr);
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
      console.log("[ReportBuilder] Report generated:", result.reportId);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          "Report generation failed. Check the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!generatedId) return;
    const ext = format === "excel" ? "xlsx" : format;
    await downloadReport(generatedId, `govvision-report-${reportType}.${ext}`);
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Report Builder</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure and generate governance reports in CSV, Excel, or PDF
          format.
        </p>
      </div>

      <div className="mb-8">
        <ReportsSubnav />
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Left Column */}
        <div className="flex-[2] space-y-8">
          {/* Section: Report Type */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-800">
              Report Type
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {REPORT_TYPES.map((rt) => (
                <label
                  key={rt.value}
                  className={`cursor-pointer border rounded-xl p-4 transition-all ${
                    reportType === rt.value
                      ? "border-gray-700 bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="reportType"
                      value={rt.value}
                      checked={reportType === rt.value}
                      onChange={() => {
                        setReportType(rt.value);
                        setGeneratedId(null);
                      }}
                      className="accent-gray-800"
                    />
                    <span className="font-semibold text-sm text-gray-800">
                      {rt.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 ml-5">{rt.description}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Section: Date Range */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">Date Range</h2>
              <select
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-gray-50 outline-none cursor-pointer hover:border-gray-300 transition-colors"
                onChange={(e) => applyPreset(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>Select...</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="2025">2025</option>
                <option value="all">All Data</option>
              </select>
            </div>
            <DateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onFromChange={setDateFrom}
              onToChange={setDateTo}
            />
          </div>

          {/* Section: Departments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">
                Departments
              </h2>
              <span className="text-xs text-gray-400">
                {selectedDepts.length === 0
                  ? "All departments selected"
                  : `${selectedDepts.length} selected`}
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedDepts([]);
                setGeneratedId(null);
                setSuccess(false);
              }}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                selectedDepts.length === 0
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              Organization Wide
            </button>
            <div className="flex flex-wrap gap-2 pt-1">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  onClick={() => toggleDept(dept)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap ${
                    selectedDepts.length > 0 && selectedDepts.includes(dept)
                      ? "bg-gray-800 text-white border-gray-800"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              Leave all unselected to include all departments in the report.
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-1 min-w-[320px] max-w-[400px] space-y-8">
          {/* Section: Format */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-800">
              Output Format
            </h2>
            <FormatSelector
              selected={format}
              onChange={(f) => {
                setFormat(f);
                setGeneratedId(null);
              }}
            />
          </div>

          {/* Section: Generate */}
          <div className="space-y-4 pt-2">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            {success && generatedId && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                <div>
                  <p className="text-gray-800 font-semibold text-sm">
                    Report generated successfully
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Click Download to save the file
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center"
                >
                  ↓ Download {format.toUpperCase()}
                </button>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white py-3.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Generating report...
                </>
              ) : (
                "Generate Report"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
