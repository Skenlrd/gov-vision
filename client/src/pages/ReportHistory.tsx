import { useState, useEffect } from 'react';
import { getReports, downloadReport } from '../services/api';
import type { ReportRecord, ReportFormat } from '../types';
import SkeletonLoader from '../components/SkeletonLoader';
import ReportsSubnav from '../components/ReportsSubnav';

// Format badge colors
const FORMAT_COLORS: Record<ReportFormat, string> = {
  csv: 'bg-green-100 text-green-800',
  excel: 'bg-blue-100 text-blue-800',
  pdf: 'bg-red-100 text-red-800',
};

// Make report type readable
function formatTypeName(type: string): string {
  return type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ReportHistory() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formatFilter, setFormatFilter] = useState<'all' | ReportFormat>('all');
  const [downloading, setDownloading] = useState<string | null>(null); // ID of report being downloaded

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getReports();
        setReports(data);
      } catch (err: any) {
        setError('Failed to load report history.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleDownload(report: ReportRecord) {
    setDownloading(report._id);
    try {
      const ext = report.format === 'excel' ? 'xlsx' : report.format;
      await downloadReport(report._id, `govvision-${report.type}-${report._id.slice(-6)}.${ext}`);
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setDownloading(null);
    }
  }

  const filtered = formatFilter === 'all'
    ? reports
    : reports.filter((r) => r.format === formatFilter);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Report History</h1>
        <p className="text-sm text-gray-500 mt-1">
          All previously generated reports. Click Download to re-download any report.
        </p>
      </div>

      <ReportsSubnav />

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 font-medium">Format:</span>
        {(['all', 'csv', 'excel', 'pdf'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFormatFilter(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              formatFilter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
        {!loading && (
          <span className="ml-auto text-sm text-gray-400">
            {filtered.length} report{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Content */}
      {loading && <SkeletonLoader rows={5} />}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="bg-gray-50 rounded-xl border p-12 text-center">
          <p className="text-gray-500 text-sm">No reports found.</p>
          <p className="text-gray-400 text-xs mt-1">Generate a report from the Report Builder to see it here.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Format</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Generated At</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date Range</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((report) => (
                <tr key={report._id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {formatTypeName(report.type)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${FORMAT_COLORS[report.format]}`}>
                      {report.format.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      report.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(report.generatedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {report.parameters?.dateFrom} → {report.parameters?.dateTo}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDownload(report)}
                      disabled={downloading === report._id}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium disabled:text-indigo-300"
                    >
                      {downloading === report._id ? 'Downloading...' : '↓ Download'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
