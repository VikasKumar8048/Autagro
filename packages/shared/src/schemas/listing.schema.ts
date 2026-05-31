import { z } from 'zod';

export const createListingSchema = z.object({
  cropName: z.string().min(2).max(100),
  variety: z.string().min(1).max(100),
  quantity: z.number().positive(),
  unit: z.enum(['KG', 'QUINTAL', 'TON', 'BAG']),
  grade: z.string().min(1).max(50),
  harvestDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  pricePerUnit: z.number().positive(),
  state: z.string().min(2).max(80),
  district: z.string().min(2).max(80),
  pincode: z.string().regex(/^\d{6}$/),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  imageUrls: z.array(z.string().url()).max(10).default([]),
});

export const updateListingSchema = createListingSchema.partial();

export const createPurchaseRequestSchema = z.object({
  listingId: z.string().uuid(),
  quantity: z.number().positive(),
  message: z.string().max(500).optional(),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type CreatePurchaseRequestInput = z.infer<typeof createPurchaseRequestSchema>;
