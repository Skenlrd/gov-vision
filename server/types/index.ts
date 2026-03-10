import { Request } from "express";

export interface IUser {
	userId: string;
	role: string;
	department: string;
}

export interface IKpiSummary {
	department: string;
	snapshotDate: Date;
	totalDecisions: number;
	approvedCount: number;
	rejectedCount: number;
	pendingCount: number;
	avgCycleTimeHours: number;
	complianceRate: number;
	riskScore: number;
	riskLevel: "Low" | "Medium" | "High" | "Critical";
}

export interface IAnomalyResult {
	id: string;
	anomalyScore: number;
	isAnomaly: boolean;
	severity: "Low" | "Medium" | "High" | "Critical" | "Normal";
}

export interface IServiceRequest extends Request {
	user?: IUser;
}
