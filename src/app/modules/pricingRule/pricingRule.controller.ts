import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PricingRuleService } from "./pricingRule.service";

const createPricingRule = catchAsync(async (req: Request, res: Response) => {
    const createdById = req.user?.userId;
    if (!createdById) {
        throw new AppError(
            httpStatus.UNAUTHORIZED,
            "Authentication is required",
        );
    }

    const payload = req.body;
    const newPricingRule = await PricingRuleService.createPricingRule(
        payload,
        createdById,
    );

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Pricing rule created successfully",
        data: newPricingRule,
    });
});

const updatePricingRule = catchAsync(async (req: Request, res: Response) => {
    const { ruleId } = req.params;
    const payload = req.body;
    const updatedPricingRule = await PricingRuleService.updatePricingRule(
        payload,
        ruleId as string,
    );

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Pricing rule updated successfully",
        data: updatedPricingRule,
    });
});

const getAllPricingRules = catchAsync(async (req: Request, res: Response) => {
    const pricingRules = await PricingRuleService.getAllPricingRules();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Pricing rules retrieved successfully",
        data: pricingRules,
    });
});

export const PricingRuleController = {
    createPricingRule,
    updatePricingRule,
    getAllPricingRules,
};
