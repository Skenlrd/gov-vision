import { Router, Request, Response } from 'express';
import { validateJWT } from '../middleware/validateJWT';
import { requireRole } from '../middleware/requireRole';
import { getOrSet } from '../services/cacheService';
import { aggregateKPI, aggregateOrgKPI } from '../services/kpiAggregator';
import m1Decision from '../models/m1Decisions';
import KPISnapshot from '../models/KPI_Snapshot';
import Forecast from '../models/Forecast';

const router = Router();

// ─────────────────────────────────────────────
// GET /api/analytics/kpi-summary
// Org-wide KPI numbers
// ─────────────────────────────────────────────

router.get(
  '/kpi-summary',
  // validateJWT, // TEMP: commented for development testing
  // requireRole(['admin', 'manager', 'executive', 'analyst']), // TEMP: commented for development testing
  async (req: Request, res: Response) => {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `m3:kpi:org:${today}`;
    const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
    const startDate = dateFrom ? new Date(dateFrom) : new Date('2024-01-01');
    const endDate = dateTo ? new Date(dateTo) : new Date();

    try {
      const data = await getOrSet(cacheKey, 300, () =>
        aggregateOrgKPI(startDate, endDate)
      );
      return res.json(data);
    } catch (err: any) {
      console.error('[GET /api/analytics/kpi-summary]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/analytics/kpi-summary/:deptId
// Department-level KPI numbers
// ─────────────────────────────────────────────

router.get(
  '/kpi-summary/:deptId',
  // validateJWT, // TEMP: commented for development testing
  // requireRole(['admin', 'manager', 'executive', 'analyst']), // TEMP: commented for development testing
  async (req: Request, res: Response) => {
    const today = new Date().toISOString().split('T')[0];
    const { deptId } = req.params as { deptId: string };
    const cacheKey = `m3:kpi:${deptId}:${today}`;
    const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
    const startDate = dateFrom ? new Date(dateFrom) : new Date('2024-01-01');
    const endDate = dateTo ? new Date(dateTo) : new Date();

    try {
      const data = await getOrSet(cacheKey, 300, () =>
        aggregateKPI(deptId, startDate, endDate)
      );
      return res.json(data);
    } catch (err: any) {
      console.error('[GET /api/analytics/kpi-summary/:deptId]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/analytics/decision-volume
// ─────────────────────────────────────────────

router.get(
  '/decision-volume',
  // validateJWT, // TEMP: commented for development testing
  // requireRole(['admin', 'manager', 'executive', 'analyst']), // TEMP: commented for development testing
  async (req: Request, res: Response) => {
    const { granularity = 'daily', dateFrom, dateTo, deptId } = req.query as {
      granularity?: string;
      dateFrom?: string;
      dateTo?: string;
      deptId?: string;
    };

    const cacheKey = `m3:volume:${deptId || 'all'}:${granularity}:${dateFrom || 'nd'}:${dateTo || 'nd'}`;

    try {
      const data = await getOrSet(cacheKey, 300, async () => {
        const formatMap: Record<string, string> = {
          daily: '%Y-%m-%d',
          weekly: '%G-W%V',
          monthly: '%Y-%m',
        };

        const format = formatMap[granularity] || '%Y-%m-%d';
        const matchStage: any = {};

        if (dateFrom) matchStage.createdAt = { $gte: new Date(dateFrom) };
        if (dateTo) matchStage.createdAt = { ...matchStage.createdAt, $lte: new Date(dateTo) };
        if (deptId) matchStage.departmentId = deptId;

        return m1Decision.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: {
                $dateToString: {
                  format,
                  date: '$createdAt',
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: '$_id', count: 1 } },
        ]);
      });

      return res.json(data);
    } catch (err: any) {
      console.error('[GET /api/analytics/decision-volume]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/analytics/cycle-time-histogram
// ─────────────────────────────────────────────

router.get(
  '/cycle-time-histogram',
  // validateJWT, // TEMP: commented for development testing
  // requireRole(['admin', 'manager', 'executive', 'analyst']), // TEMP: commented for development testing
  async (req: Request, res: Response) => {
    const { deptId } = req.query as { deptId?: string };
    const cacheKey = `m3:cycletime:${deptId || 'all'}`;

    try {
      const data = await getOrSet(cacheKey, 300, async () => {
        const match: any = { completedAt: { $exists: true, $ne: null } };
        if (deptId) match.departmentId = deptId;

        const decisions = await m1Decision
          .find(match)
          .select('cycleTimeHours createdAt completedAt')
          .lean();

        const buckets = { '0-24h': 0, '24-48h': 0, '48-72h': 0, '>72h': 0 };

        for (const d of decisions as any[]) {
          const hours =
            d.cycleTimeHours ||
            (new Date(d.completedAt).getTime() - new Date(d.createdAt).getTime()) /
              (1000 * 60 * 60);

          if (hours <= 24) buckets['0-24h']++;
          else if (hours <= 48) buckets['24-48h']++;
          else if (hours <= 72) buckets['48-72h']++;
          else buckets['>72h']++;
        }

        return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
      });

      return res.json(data);
    } catch (err: any) {
      console.error('[GET /api/analytics/cycle-time-histogram]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/analytics/compliance-trend
// ─────────────────────────────────────────────

router.get(
  '/compliance-trend',
  // validateJWT, // TEMP: commented for development testing
  // requireRole(['admin', 'manager', 'executive', 'analyst']), // TEMP: commented for development testing
  async (req: Request, res: Response) => {
    const { deptIds, dateFrom, dateTo } = req.query as {
      deptIds?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    const cacheKey = `m3:compliance:${deptIds || 'all'}:${dateFrom || 'nd'}:${dateTo || 'nd'}`;

    try {
      const data = await getOrSet(cacheKey, 300, async () => {
        const match: any = {};
        if (dateFrom) match.snapshotDate = { $gte: new Date(dateFrom) };
        if (dateTo) match.snapshotDate = { ...match.snapshotDate, $lte: new Date(dateTo) };
        if (deptIds) match.department = { $in: deptIds.split(',') };

        return KPISnapshot.aggregate([
          { $match: match },
          { $sort: { snapshotDate: 1 } },
          {
            $group: {
              _id: '$department',
              data: { $push: { date: '$snapshotDate', complianceRate: '$complianceRate' } },
            },
          },
          { $project: { department: '$_id', data: 1, _id: 0 } },
        ]);
      });

      return res.json(data);
    } catch (err: any) {
      console.error('[GET /api/analytics/compliance-trend]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/analytics/risk-heatmap
// ─────────────────────────────────────────────

router.get(
  '/risk-heatmap',
  // validateJWT, // TEMP: commented for development testing
  // requireRole(['admin', 'manager', 'executive', 'analyst']), // TEMP: commented for development testing
  async (req: Request, res: Response) => {
    const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
    const cacheKey = `m3:riskheatmap:${dateFrom || 'nd'}:${dateTo || 'nd'}`;

    try {
      const data = await getOrSet(cacheKey, 300, async () => {
        const match: any = {};
        if (dateFrom) match.snapshotDate = { $gte: new Date(dateFrom) };
        if (dateTo) match.snapshotDate = { ...match.snapshotDate, $lte: new Date(dateTo) };

        return KPISnapshot.aggregate([
          { $match: match },
          { $sort: { snapshotDate: -1 } },
          {
            $group: {
              _id: '$departmentId',
              Low: { $sum: { $cond: [{ $eq: ['$riskLevel', 'low'] }, 1, 0] } },
              Medium: { $sum: { $cond: [{ $eq: ['$riskLevel', 'medium'] }, 1, 0] } },
              High: { $sum: { $cond: [{ $eq: ['$riskLevel', 'high'] }, 1, 0] } },
              Critical: { $sum: { $cond: [{ $eq: ['$riskLevel', 'critical'] }, 1, 0] } },
              riskScore: { $first: '$riskScore' },
              riskLevel: { $first: '$riskLevel' },
              featureImportance: { $first: '$featureImportance' },
            },
          },
          {
            $project: {
              _id: 0,
              department: '$_id',
              deptId: '$_id',
              Low: 1,
              Medium: 1,
              High: 1,
              Critical: 1,
              riskScore: { $ifNull: ['$riskScore', 0] },
              riskLevel: { $ifNull: ['$riskLevel', 'low'] },
              featureImportance: { $ifNull: ['$featureImportance', null] },
            },
          },
        ]);
      });

      return res.json(data);
    } catch (err: any) {
      console.error('[GET /api/analytics/risk-heatmap]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/analytics/forecast
// Forecast data for a department and horizon
// ─────────────────────────────────────────────

router.get(
  '/forecast',
  // validateJWT, // TEMP: commented for development testing
  // requireRole(['admin', 'manager', 'executive', 'analyst']), // TEMP: commented for development testing
  async (req: Request, res: Response) => {
    const { deptId = 'org', horizon = '30', target = 'volume' } = req.query as {
      deptId?: string;
      horizon?: string;
      target?: string;
    };

    const parsedHorizon = Number.parseInt(horizon, 10);
    const parsedTarget = String(target).toLowerCase();

    if (![7, 14, 30].includes(parsedHorizon)) {
      return res.status(400).json({ error: 'horizon must be 7, 14, or 30' });
    }
    if (!['volume', 'delay'].includes(parsedTarget)) {
      return res.status(400).json({ error: "target must be 'volume' or 'delay'" });
    }

    const horizonNum = parsedHorizon as 7 | 14 | 30;
    const targetValue = parsedTarget as 'volume' | 'delay';

    const cacheKey = `m3:forecast:${deptId}:${targetValue}:${horizonNum}`;

    try {
      const data = await getOrSet(cacheKey, 3600, async () => {
        const forecast = await Forecast.findOne({
          department: deptId,
          target: targetValue,
          horizon: horizonNum,
        }).lean();

        if (!forecast) {
          return null;
        }

        return forecast;
      });

      if (!data) {
        return res.status(404).json({ error: 'No forecast found. Run the forecast job first.' });
      }

      return res.json(data);
    } catch (err: any) {
      console.error('[GET /api/analytics/forecast]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
);

export default router;
