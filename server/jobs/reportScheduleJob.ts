import cron from "node-cron"
import ReportSchedule from "../models/ReportSchedule"
import Report from "../models/Report"
import { generateReport, ReportFormat, ReportType } from "../services/reportGenerator"

function calculateDateRange(mode: string): { dateFrom: string; dateTo: string } {
  const today = new Date()
  const days = mode === "last_7_days" ? 7 : mode === "last_30_days" ? 30 : 90
  const from = new Date(today.getTime() - days * 24 * 60 * 60 * 1000)

  return {
    dateFrom: from.toISOString().split("T")[0],
    dateTo: today.toISOString().split("T")[0],
  }
}

function calculateNextRun(frequency: string, from: Date): Date {
  const next = new Date(from)
  if (frequency === "daily") next.setDate(next.getDate() + 1)
  else if (frequency === "weekly") next.setDate(next.getDate() + 7)
  else next.setMonth(next.getMonth() + 1)
  return next
}

export async function runScheduleCheck(): Promise<void> {
  const now = new Date()

  const dueSchedules = await ReportSchedule.find({
    isActive: true,
    nextRunAt: { $lte: now },
  })

  if (dueSchedules.length === 0) {
    console.log("[ScheduleJob] No due schedules found.")
    return
  }

  console.log(`[ScheduleJob] Found ${dueSchedules.length} due schedule(s).`)

  for (const schedule of dueSchedules) {
    console.log(`[ScheduleJob] Running schedule: ${schedule.name}`)

    try {
      const { dateFrom, dateTo } = calculateDateRange(
        schedule.reportConfig?.dateRangeMode || "last_30_days"
      )

      const filePath = await generateReport({
        type: schedule.reportConfig?.type as ReportType,
        format: schedule.reportConfig?.format as ReportFormat,
        dateFrom,
        dateTo,
        departments: schedule.reportConfig?.departments || [],
        requestedBy: `schedule:${String(schedule._id)}`,
      })

      await Report.create({
        type: schedule.reportConfig?.type,
        format: schedule.reportConfig?.format,
        status: "completed",
        filePath,
        parameters: {
          type: schedule.reportConfig?.type,
          format: schedule.reportConfig?.format,
          dateFrom,
          dateTo,
          departments: schedule.reportConfig?.departments || [],
          requestedBy: `schedule:${String(schedule._id)}`,
        },
        generatedBy: `schedule:${schedule.name}`,
        generatedAt: new Date(),
      })

      await ReportSchedule.findByIdAndUpdate(schedule._id, {
        lastRunAt: now,
        lastRunStatus: "success",
        nextRunAt: calculateNextRun(schedule.frequency, now),
      })

      console.log(`[ScheduleJob] Schedule \"${schedule.name}\" completed successfully.`)
    } catch (err: any) {
      console.error(`[ScheduleJob] Schedule \"${schedule.name}\" failed:`, err.message)
      await ReportSchedule.findByIdAndUpdate(schedule._id, {
        lastRunAt: now,
        lastRunStatus: "failed",
        nextRunAt: calculateNextRun(schedule.frequency, now),
      })
    }
  }
}

cron.schedule("0 * * * *", () => {
  runScheduleCheck().catch((err) =>
    console.error("[ScheduleJob] Uncaught error:", err)
  )
})

console.log("[ScheduleJob] Scheduled: checks every hour.")
