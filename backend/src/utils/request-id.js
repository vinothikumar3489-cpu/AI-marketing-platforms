let counter = 0;
export function generateRequestId() {
  counter++;
  return `REQ-${Date.now().toString(36).toUpperCase()}-${counter.toString(36).toUpperCase().padStart(3, '0')}`;
}

export function requestIdMiddleware(req, res, next) {
  req.requestId = generateRequestId();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
