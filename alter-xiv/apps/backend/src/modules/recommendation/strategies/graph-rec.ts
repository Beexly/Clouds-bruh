/**
 * GRAPH-REC (RecoGCN-inspired) — UPGRADE to ORACLE.
 * Naive cosine similarity treats products as isolated vectors. RecoGCN models the
 * user–item–context as a heterogeneous graph and learns embeddings via relational
 * graph convolution + meta-paths — strong for sequential intent and "complete the set"
 * (co-purchase) where the SIGNAL of "what goes with what" lives in graph structure.
 *
 * Pattern (offline train / online serve):
 *   offline:  build graph from SIGNAL (visitor→view/cart/buy→product, product→chapter,
 *             co-purchase edges) → train relational GCN (RecoGCN train.py/models.py) →
 *             export node embeddings to pgvector.
 *   online:   serve nearest-neighbor over the LEARNED graph embeddings (not raw content);
 *             track MRR / NDCG / HR@k like RecoGCN, feeding the Learning Loop.
 */
export async function graphRecForVisitor(visitorId: string, limit = 12): Promise<string[]> {
  // TODO: query precomputed RecoGCN node-embeddings (pgvector) for this visitor's neighborhood.
  //       Fall back to cosine 'for_you' on cold start. Log MRR/NDCG/HR@k to the Ledger.
  return [];
}
