import crypto from "crypto";

export const generateTrackingId = () => {
  const prefix = "PF"; 
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `${prefix}-${date}-${random}`;
};
