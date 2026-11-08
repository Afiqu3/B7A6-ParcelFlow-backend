import { z } from "zod";

const paginationQuery = {
	page: z.string().regex(/^[1-9]\d*$/, "Page must be a positive integer").optional(),
	limit: z.string().regex(/^[1-9]\d*$/, "Limit must be a positive integer").optional(),
};

export const divisionIdQuerySchema = z.object({
	divisionId: z.uuid("Division ID must be a valid UUID"),
	...paginationQuery,
});

export const districtIdQuerySchema = z.object({
	districtId: z.uuid("District ID must be a valid UUID"),
	...paginationQuery,
});