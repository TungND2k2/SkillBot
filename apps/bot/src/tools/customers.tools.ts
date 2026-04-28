import { z } from "zod";
import { createCrudTools } from "./factory.js";

export const customerTools = createCrudTools({
  slug: "customers",
  label: { singular: "khách hàng", plural: "khách hàng" },
  titleField: "name",
  filterableFields: ["name", "country", "phone", "email"],
  inputSchema: {
    name: z.string().describe("Tên khách / brand (vd: ABC Baby Co.)"),
    country: z.string().optional().describe("Quốc gia"),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    social: z.string().optional().describe("Link FB/IG/Zalo"),
    notes: z.string().optional(),
  },
});
