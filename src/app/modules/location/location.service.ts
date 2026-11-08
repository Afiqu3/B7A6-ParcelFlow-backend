import { prisma } from "../../lib/prisma";
import type { IQuery } from "../../interfaces";

const getDivisions = async () => {
	return prisma.division.findMany({
		where: { isActive: true },
		select: {
			id: true,
			name: true,
		},
		orderBy: { name: "asc" },
	});
};

const getDistricts = async (divisionId: string, query: IQuery) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const where = {
		divisionId,
		isActive: true,
		division: { isActive: true },
	};

	const [districts, total] = await Promise.all([
		prisma.district.findMany({
			where: {
				...where,
			},
			take: limit,
			skip,
			select: {
				id: true,
				name: true,
				divisionId: true,
			},
			orderBy: { name: "asc" },
		}),
		prisma.district.count({ where }),
	]);

	return {
		data: districts,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getCities = async (districtId: string, query: IQuery) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const where = {
		districtId,
		isActive: true,
		district: {
			isActive: true,
			division: { isActive: true },
		},
	};

	const [cities, total] = await Promise.all([
		prisma.city.findMany({
			where,
			take: limit,
			skip,
			select: {
				id: true,
				name: true,
				districtId: true,
			},
			orderBy: { name: "asc" },
		}),
		prisma.city.count({ where }),
	]);

	return {
		data: cities,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

export const LocationService = {
	getDivisions,
	getDistricts,
	getCities,
};
