// middleware/validate.middleware.js
// ============================================================
//  Zod Request Validation Middleware
//
//  Zod is a schema validation library. We define the expected
//  shape of request data (body, params, query) and Zod checks it.
//  If validation fails, we return a 400 error with clear messages.
//
//  Usage:
//    const { z } = require("zod");
//    const schema = z.object({ body: z.object({ surveyNumber: z.string() }) });
//    router.post("/register", validate(schema), controller);
// ============================================================

const { z } = require("zod");
const { AppError } = require("../utils/errorHandler");

/**
 * Validate request against a Zod schema.
 * The schema should have keys: body, params, query (all optional).
 *
 * @param {z.ZodSchema} schema
 */
const validate = (schema) => (req, res, next) => {
  try {
    // Parse only the sections that exist in the schema
    const result = schema.parse({
      body:   req.body,
      params: req.params,
      query:  req.query,
    });

    // Attach validated + coerced values back to req
    if (result.body)   req.body   = result.body;
    if (result.params) req.params = result.params;
    if (result.query)  req.query  = result.query;

    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      // Format Zod errors into readable messages
      const messages = err.errors.map(
        (e) => `${e.path.join(".")}: ${e.message}`
      );
      return next(new AppError(`Validation Error: ${messages.join("; ")}`, 400));
    }
    next(err);
  }
};

// ── Reusable Zod Schemas ──────────────────────────────────────

const { z: zod } = require("zod");

// Ethereum address validator
const ethAddress = zod
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address")
  .transform((v) => v.toLowerCase());

// Common schemas used in multiple routes
const schemas = {
  // GET /auth/nonce/:address
  getNonce: zod.object({
    params: zod.object({ address: ethAddress }),
  }),

  // POST /auth/verify
  verifySignature: zod.object({
    body: zod.object({
      address:   ethAddress,
      signature: zod.string().min(1, "Signature is required"),
      role:      zod.enum(["admin", "seller", "buyer", "public"]).optional(),
    }),
  }),

  // GET /lands?page=1&limit=10&status=PENDING&search=MG+Road
  getLands: zod.object({
    query: zod.object({
      page:    zod.coerce.number().int().positive().default(1),
      limit:   zod.coerce.number().int().positive().max(100).default(10),
      status:  zod.enum(["PENDING","VERIFIED","REJECTED","DISPUTED","FROZEN"]).optional(),
      search:  zod.string().optional(),
      owner:   ethAddress.optional(),
    }).default({}),
  }),

  // GET /lands/:id  or  /transfers/:landId
  landIdParam: zod.object({
    params: zod.object({
      id: zod.coerce.number().int().positive("Land ID must be a positive number"),
    }),
  }),

  landIdParamAsLandId: zod.object({
    params: zod.object({
      landId: zod.coerce.number().int().positive(),
    }),
  }),

  // GET /lands/owner/:address
  ownerParam: zod.object({
    params: zod.object({ address: ethAddress }),
  }),

  // GET /notifications?page=1
  pagination: zod.object({
    query: zod.object({
      page:  zod.coerce.number().int().positive().default(1),
      limit: zod.coerce.number().int().positive().max(50).default(20),
    }).default({}),
  }),
};

module.exports = { validate, schemas };

