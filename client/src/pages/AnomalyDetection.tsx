import React, { useEffect, useState } from "react";
import { getAnomalyGroups } from "../services/api";
import AnomalyTableRow from "../components/AnomalyTableRow";
import type { IAnomaly, IAnomalyGroup } from "../types/index";

const INITIAL_GROUPS: IAnomalyGroup = {};

const AnomalyDetectionPage: React.FC = () => {
  const [anomalyData, setAnomalyData] = useState<IAnomalyGroup>(INITIAL_GROUPS);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getAnomalyGroups()
      .then((data) => {
        setAnomalyData(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load anomaly data.");
        setLoading(false);
      });
  }, []);

  const allAnomalies: IAnomaly[] = Object.values(anomalyData).flat();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Anomaly Detection</h1>
      {error && <div className="bg-red-100 text-red-700 p-2 mb-4">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : allAnomalies.length === 0 ? (
        <div className="text-gray-500">No anomalies detected.</div>
      ) : (
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead>
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Decision ID</th>
              <th className="px-4 py-2">Department</th>
              <th className="px-4 py-2">Severity</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {allAnomalies.map((anomaly) => (
              <AnomalyTableRow key={anomaly.id} anomaly={anomaly} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AnomalyDetectionPage;
