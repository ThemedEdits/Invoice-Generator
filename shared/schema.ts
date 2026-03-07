import { z } from "zod";

export const templateFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["text", "number", "currency", "percentage", "date", "calculated"]),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  fontSize: z.number().default(12),
  alignment: z.enum(["left", "center", "right"]).default("left"),
  page: z.number().default(1),
});

export const insertTemplateSchema = z.object({
  userId: z.string(),
  name: z.string(),
  fileURL: z.string(),
  fields: z.array(templateFieldSchema).default([]),
});
export const templateSchema = insertTemplateSchema.extend({ id: z.string(), createdAt: z.number() });

export const insertCustomerSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
});
export const customerSchema = insertCustomerSchema.extend({ id: z.string() });

export const invoiceItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  price: z.number(),
  total: z.number(),
});

export const insertInvoiceSchema = z.object({
  userId: z.string(),
  templateId: z.string(),
  customerId: z.string(),
  values: z.record(z.any()),
  lineItems: z.array(invoiceItemSchema).default([]),
  totals: z.object({
    subtotal: z.number(),
    tax: z.number(),
    discount: z.number(),
    grandTotal: z.number(),
  }),
  status: z.enum(["Draft", "Sent", "Paid", "Overdue"]).default("Draft"),
  pdfURL: z.string().optional(),
});
export const invoiceSchema = insertInvoiceSchema.extend({ id: z.string(), createdAt: z.number() });

export type Template = z.infer<typeof templateSchema>;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type TemplateField = z.infer<typeof templateFieldSchema>;
export type Customer = z.infer<typeof customerSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
