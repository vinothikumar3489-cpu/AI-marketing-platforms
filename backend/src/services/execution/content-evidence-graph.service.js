// Single source of truth for the chat-level evidence graph lives in
// ../normalizers/evidence-graph.js. This module existed as a near-duplicate
// implementation; re-exporting keeps any existing consumers working while
// eliminating the drift between the two copies.
export { buildEvidenceGraph } from '../normalizers/evidence-graph.js';
export { default } from '../normalizers/evidence-graph.js';
