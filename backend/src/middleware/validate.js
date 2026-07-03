import { validationErrorResponse } from '../utils/response.util.js';

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return validationErrorResponse(res, result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })));
    }
    req.body = result.data;
    next();
  };
}
