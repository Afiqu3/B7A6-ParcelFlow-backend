import httpStatus from "http-status";
import {
	AccountStatus,
	AssignmentLeg,
	AssignmentStatus,
	ParcelStatus,
	PaymentType,
	RiderApplicationStatus,
	Role,
	TransactionStatus,
} from "../../../generated/prisma/enums";
import type {
	AssignmentWhereInput,
	ParcelWhereInput,
} from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { ACTIVE_ASSIGNMENT_STATUSES } from "../assignment/assignment.constants";

// ── Small helpers ─────────────────────────────────────────

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// A zero-filled record over every value of an enum, so a breakdown always
// carries the full set of keys even when some have no rows.
const zeroFilled = <T extends string>(
	keys: readonly T[],
): Record<T, number> => {
	const out = {} as Record<T, number>;
	for (const key of keys) {
		out[key] = 0;
	}
	return out;
};

const deliverySuccessRate = (delivered: number, returned: number) =>
	delivered + returned > 0
		? round2((delivered / (delivered + returned)) * 100)
		: 0;

// ── Trend helpers (last 30 days, Asia/Dhaka = UTC+6, no DST) ─

const TREND_DAYS = 30;
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

// Fetch a little extra so rows near the window edge aren't dropped after the
// timezone shift.
const trendSince = () =>
	new Date(Date.now() - (TREND_DAYS + 1) * 24 * 60 * 60 * 1000);

const dhakaDayKey = (date: Date) =>
	new Date(date.getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);

// Bucket timestamps into a continuous last-30-days series (oldest -> newest),
// filling empty days with 0 so the frontend can chart it directly.
const buildDailyTrend = (dates: Date[]): { date: string; count: number }[] => {
	const counts = new Map<string, number>();
	for (const date of dates) {
		const key = dhakaDayKey(date);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}

	const today = new Date(Date.now() + DHAKA_OFFSET_MS);
	today.setUTCHours(0, 0, 0, 0);

	const series: { date: string; count: number }[] = [];
	for (let i = TREND_DAYS - 1; i >= 0; i--) {
		const day = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
		const key = day.toISOString().slice(0, 10);
		series.push({ date: key, count: counts.get(key) ?? 0 });
	}
	return series;
};

// ── Breakdown helpers ─────────────────────────────────────

const parcelStatusBreakdown = async (where: ParcelWhereInput) => {
	const grouped = await prisma.parcel.groupBy({
		by: ["status"],
		where,
		_count: { _all: true },
	});

	const result = zeroFilled(Object.values(ParcelStatus) as ParcelStatus[]);
	for (const row of grouped) {
		result[row.status] = row._count._all;
	}
	return result;
};

const assignmentStatusBreakdown = async (where: AssignmentWhereInput) => {
	const grouped = await prisma.assignment.groupBy({
		by: ["status"],
		where,
		_count: { _all: true },
	});

	const result = zeroFilled(
		Object.values(AssignmentStatus) as AssignmentStatus[],
	);
	for (const row of grouped) {
		result[row.status] = row._count._all;
	}
	return result;
};

// ── Admin dashboard (platform-wide) ───────────────────────

const getAdminStats = async () => {
	const since = trendSince();

	const [
		totalMerchants,
		blockedMerchants,
		totalRiders,
		ridersByApplicationRows,
		pendingRiderApprovals,
		totalAdmins,
		totalParcels,
		parcelsByStatus,
		deliveredChargeAgg,
		txByStatusRows,
		codCollectedAgg,
		codOutstandingAgg,
		assignmentsByStatus,
		activeAssignments,
		parcelCreatedRows,
		deliveredRows,
	] = await Promise.all([
		prisma.merchantProfile.count({ where: { isDeleted: false } }),
		prisma.user.count({
			where: {
				role: Role.MERCHANT,
				status: AccountStatus.BLOCKED,
				isDeleted: false,
			},
		}),
		prisma.riderProfile.count({ where: { isDeleted: false } }),
		prisma.riderProfile.groupBy({
			by: ["applicationStatus"],
			where: { isDeleted: false },
			_count: { _all: true },
		}),
		prisma.riderProfile.count({
			where: {
				isDeleted: false,
				applicationStatus: RiderApplicationStatus.PENDING,
			},
		}),
		prisma.user.count({
			where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] }, isDeleted: false },
		}),
		prisma.parcel.count({ where: { isDeleted: false } }),
		parcelStatusBreakdown({ isDeleted: false }),
		prisma.parcel.aggregate({
			_sum: { totalCharge: true },
			where: { isDeleted: false, status: ParcelStatus.DELIVERED },
		}),
		prisma.transaction.groupBy({
			by: ["status"],
			_sum: { amount: true },
			_count: { _all: true },
		}),
		prisma.parcel.aggregate({
			_sum: { codAmount: true },
			where: {
				isDeleted: false,
				paymentType: PaymentType.COD,
				status: ParcelStatus.DELIVERED,
			},
		}),
		prisma.parcel.aggregate({
			_sum: { codAmount: true },
			where: {
				isDeleted: false,
				paymentType: PaymentType.COD,
				status: {
					notIn: [
						ParcelStatus.DELIVERED,
						ParcelStatus.RETURNED_TO_MERCHANT,
						ParcelStatus.CANCELLED,
					],
				},
			},
		}),
		assignmentStatusBreakdown({}),
		prisma.assignment.count({
			where: { status: { in: ACTIVE_ASSIGNMENT_STATUSES } },
		}),
		prisma.parcel.findMany({
			where: { isDeleted: false, createdAt: { gte: since } },
			select: { createdAt: true },
		}),
		prisma.parcel.findMany({
			where: { deliveredAt: { gte: since } },
			select: { deliveredAt: true },
		}),
	]);

	const ridersByApplicationStatus = zeroFilled(
		Object.values(RiderApplicationStatus) as RiderApplicationStatus[],
	);
	for (const row of ridersByApplicationRows) {
		ridersByApplicationStatus[row.applicationStatus] = row._count._all;
	}

	const revenueByTxStatus = zeroFilled(
		Object.values(TransactionStatus) as TransactionStatus[],
	);
	for (const row of txByStatusRows) {
		revenueByTxStatus[row.status] = Number(row._sum.amount ?? 0);
	}

	return {
		overview: {
			totalMerchants,
			blockedMerchants,
			totalRiders,
			totalAdmins,
			totalParcels,
			pendingRiderApprovals,
			activeAssignments,
		},
		riders: {
			total: totalRiders,
			byApplicationStatus: ridersByApplicationStatus,
		},
		parcels: {
			total: totalParcels,
			byStatus: parcelsByStatus,
		},
		delivery: {
			delivered: parcelsByStatus[ParcelStatus.DELIVERED],
			failed: parcelsByStatus[ParcelStatus.DELIVERY_FAILED],
			returned: parcelsByStatus[ParcelStatus.RETURNED_TO_MERCHANT],
			successRate: deliverySuccessRate(
				parcelsByStatus[ParcelStatus.DELIVERED],
				parcelsByStatus[ParcelStatus.RETURNED_TO_MERCHANT],
			),
		},
		revenue: {
			bkash: {
				paid: revenueByTxStatus[TransactionStatus.PAID],
				pending: revenueByTxStatus[TransactionStatus.PENDING],
				refunded: revenueByTxStatus[TransactionStatus.REFUNDED],
			},
			realizedDeliveryCharge: Number(deliveredChargeAgg._sum.totalCharge ?? 0),
			cod: {
				collected: Number(codCollectedAgg._sum.codAmount ?? 0),
				outstanding: Number(codOutstandingAgg._sum.codAmount ?? 0),
			},
		},
		assignments: {
			active: activeAssignments,
			byStatus: assignmentsByStatus,
		},
		trends: {
			parcelsCreated: buildDailyTrend(
				parcelCreatedRows.map((row) => row.createdAt),
			),
			deliveries: buildDailyTrend(
				deliveredRows
					.map((row) => row.deliveredAt)
					.filter((d): d is Date => d !== null),
			),
		},
	};
};

// ── Merchant dashboard (their own parcels) ────────────────

const getMerchantStats = async (userId: string) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: { merchantProfile: true },
	});

	if (!user || !user.merchantProfile) {
		throw new AppError(httpStatus.NOT_FOUND, "Merchant profile not found");
	}
	if (user.isDeleted) {
		throw new AppError(httpStatus.GONE, "Merchant account has been deleted");
	}

	const merchantId = user.merchantProfile.id;
	const since = trendSince();
	const baseWhere: ParcelWhereInput = { merchantId, isDeleted: false };

	const [
		totalParcels,
		parcelsByStatus,
		billedAgg,
		prepaidPaidAgg,
		prepaidPendingAgg,
		codCollectedAgg,
		codPendingAgg,
		byPaymentTypeRows,
		createdRows,
	] = await Promise.all([
		prisma.parcel.count({ where: baseWhere }),
		parcelStatusBreakdown(baseWhere),
		prisma.parcel.aggregate({
			_sum: { totalCharge: true },
			where: { ...baseWhere, status: { not: ParcelStatus.CANCELLED } },
		}),
		prisma.transaction.aggregate({
			_sum: { amount: true },
			where: { status: TransactionStatus.PAID, parcel: { merchantId } },
		}),
		prisma.transaction.aggregate({
			_sum: { amount: true },
			where: { status: TransactionStatus.PENDING, parcel: { merchantId } },
		}),
		prisma.parcel.aggregate({
			_sum: { codAmount: true },
			where: {
				...baseWhere,
				paymentType: PaymentType.COD,
				status: ParcelStatus.DELIVERED,
			},
		}),
		prisma.parcel.aggregate({
			_sum: { codAmount: true },
			where: {
				...baseWhere,
				paymentType: PaymentType.COD,
				status: {
					notIn: [
						ParcelStatus.DELIVERED,
						ParcelStatus.RETURNED_TO_MERCHANT,
						ParcelStatus.CANCELLED,
					],
				},
			},
		}),
		prisma.parcel.groupBy({
			by: ["paymentType"],
			where: baseWhere,
			_count: { _all: true },
		}),
		prisma.parcel.findMany({
			where: { ...baseWhere, createdAt: { gte: since } },
			select: { createdAt: true },
		}),
	]);

	const byPaymentType = zeroFilled(Object.values(PaymentType) as PaymentType[]);
	for (const row of byPaymentTypeRows) {
		byPaymentType[row.paymentType] = row._count._all;
	}

	return {
		overview: {
			totalParcels,
			delivered: parcelsByStatus[ParcelStatus.DELIVERED],
			inFlight:
				totalParcels -
				parcelsByStatus[ParcelStatus.DELIVERED] -
				parcelsByStatus[ParcelStatus.RETURNED_TO_MERCHANT] -
				parcelsByStatus[ParcelStatus.CANCELLED],
		},
		parcels: {
			total: totalParcels,
			byStatus: parcelsByStatus,
			byPaymentType,
		},
		delivery: {
			delivered: parcelsByStatus[ParcelStatus.DELIVERED],
			failed: parcelsByStatus[ParcelStatus.DELIVERY_FAILED],
			returned: parcelsByStatus[ParcelStatus.RETURNED_TO_MERCHANT],
			successRate: deliverySuccessRate(
				parcelsByStatus[ParcelStatus.DELIVERED],
				parcelsByStatus[ParcelStatus.RETURNED_TO_MERCHANT],
			),
		},
		spend: {
			totalDeliveryCharge: Number(billedAgg._sum.totalCharge ?? 0),
			prepaidPaid: Number(prepaidPaidAgg._sum.amount ?? 0),
			prepaidPending: Number(prepaidPendingAgg._sum.amount ?? 0),
		},
		cod: {
			collected: Number(codCollectedAgg._sum.codAmount ?? 0),
			pending: Number(codPendingAgg._sum.codAmount ?? 0),
		},
		trends: {
			parcelsCreated: buildDailyTrend(createdRows.map((row) => row.createdAt)),
		},
	};
};

// ── Rider dashboard (their own assignments) ───────────────

const getRiderStats = async (userId: string) => {
	const rider = await prisma.riderProfile.findUnique({
		where: { userId },
	});

	if (!rider) {
		throw new AppError(httpStatus.NOT_FOUND, "Rider profile not found");
	}
	if (rider.isDeleted) {
		throw new AppError(httpStatus.GONE, "Rider account has been deleted");
	}

	const riderId = rider.id;
	const since = trendSince();

	const [
		totalAssignments,
		byStatus,
		activePickups,
		activeDeliveries,
		completedPickups,
		completedDeliveries,
		failedDeliveries,
		completedRows,
	] = await Promise.all([
		prisma.assignment.count({ where: { riderId } }),
		assignmentStatusBreakdown({ riderId }),
		prisma.assignment.count({
			where: {
				riderId,
				leg: AssignmentLeg.PICKUP,
				status: { in: ACTIVE_ASSIGNMENT_STATUSES },
			},
		}),
		prisma.assignment.count({
			where: {
				riderId,
				leg: AssignmentLeg.DELIVERY,
				status: { in: ACTIVE_ASSIGNMENT_STATUSES },
			},
		}),
		prisma.assignment.count({
			where: {
				riderId,
				leg: AssignmentLeg.PICKUP,
				status: AssignmentStatus.COMPLETED,
			},
		}),
		prisma.assignment.count({
			where: {
				riderId,
				leg: AssignmentLeg.DELIVERY,
				status: AssignmentStatus.COMPLETED,
			},
		}),
		prisma.assignment.count({
			where: {
				riderId,
				leg: AssignmentLeg.DELIVERY,
				status: AssignmentStatus.FAILED,
			},
		}),
		prisma.assignment.findMany({
			where: {
				riderId,
				status: AssignmentStatus.COMPLETED,
				completedAt: { gte: since },
			},
			select: { completedAt: true },
		}),
	]);

	const successRate =
		completedDeliveries + failedDeliveries > 0
			? round2(
					(completedDeliveries / (completedDeliveries + failedDeliveries)) *
						100,
				)
			: 0;

	return {
		overview: {
			totalAssignments,
			activePickups,
			activeDeliveries,
			completedPickups,
			completedDeliveries,
		},
		assignments: {
			total: totalAssignments,
			byStatus,
		},
		performance: {
			completedDeliveries,
			failedDeliveries,
			deliverySuccessRate: successRate,
		},
		trends: {
			completedAssignments: buildDailyTrend(
				completedRows
					.map((row) => row.completedAt)
					.filter((d): d is Date => d !== null),
			),
		},
	};
};

export const StatsService = {
	getAdminStats,
	getMerchantStats,
	getRiderStats,
};
