const { ZodError } = require('zod');

/**
 * Create validation middleware from a Zod schema
 * @param {import('zod').ZodSchema} schema - Zod validation schema
 * @param {'body'|'query'|'params'} source - Request property to validate
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed; // Replace with parsed (cleaned) data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details }
        });
      }
      next(error);
    }
  };
}

module.exports = validate;
