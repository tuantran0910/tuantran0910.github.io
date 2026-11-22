# Content Audit & Editorial Status

Review date: **2026-11-22**.

## Audit findings

The project contains **19 in-depth lessons**, expanded from the previous version. However, **a complete conversation export is not available** to verify that the full original text and any supplementary explanations are present for every lesson. This is therefore **not a verified, complete conversion of the transcript**.

### State of the evidence

- **Lessons 1–4:** The titles and sequence of topics were recovered from historical context. The content was reconstructed and has not been compared against the full source text.
- **Lessons 5–7:** These chapters offer useful coverage of their topics, but their original titles and positions in the lesson sequence **have not been verified**. Do not claim that they match the transcript exactly.
- **Lessons 8–14:** The topics were identified from the learning sequence. No complete copy of the source text is available in the workspace.
- **Lessons 15–19:** The current conversation records substantial information about these lessons. The website content was expanded for reference, but each section still needs to be checked against the original to avoid omissions.

### Technical checks performed

- Cross-checked selected technical details against official Kubernetes, Argo CD, GKE, and Istio documentation.
- Corrected **Lesson 3**: Argo CD's Structured-Merge Diff strategy **has been discontinued**. In newer releases, Server-Side Diff uses a Server-Side Apply dry run.
- Expanded all 19 lessons with in-depth coverage of processing flows, operational mechanisms, production scenarios, debugging, and exercises.
- Checked front matter structure, Markdown code fences, and the **YAML syntax** of code snippets. Valid YAML syntax does not establish that a manifest conforms to the API schema or can run in a cluster.
- Regenerated the search index from the content available at the time.

### Not verified in this audit

- **Transcript fidelity:** No export was available to compare against the full content and follow-up questions.
- **Kubernetes schema/runtime:** `kubectl --dry-run=server` was not run against a cluster with all required CRDs and GKE add-ons.
- **Documentation production build:** The audit did not run `npm run build` because npm dependencies were not installed in the environment and the required packages were not available in the offline npm cache.
- **External links:** Key documentation was consulted online, but no exhaustive automated HTTP crawl of every URL was performed.

### Metrics by lesson

| Lesson | Topic | Words | YAML snippets | Source fidelity |
|---|---|---:|---:|---|
| 01 | Argo CD Internal Architecture & Reconciliation Mechanism | 1888 | 2 | Editorial reconstruction pending comparison with the full source text |
| 02 | Kubernetes Server-Side Apply, Field Ownership & Conflict Resolution | 1436 | 2 | Editorial reconstruction pending comparison with the full source text |
| 03 | Structured Merge Diff, OpenAPI Schema & Field Ownership | 1283 | 2 | Editorial reconstruction pending comparison with the full source text |
| 04 | Argo CD ApplicationSet & Multi-Cluster GitOps | 1260 | 2 | Editorial reconstruction pending comparison with the full source text |
| 05 | Config Connector, Config Sync & Cloud Resource Reconciliation | 1344 | 1 | Editorial reconstruction pending comparison with the full source text |
| 06 | GKE Workload Identity Federation & External Secrets | 1222 | 3 | Editorial reconstruction pending comparison with the full source text |
| 07 | Kubernetes Admission Controllers & Policy | 1159 | 2 | Editorial reconstruction pending comparison with the full source text |
| 08 | Kubernetes Operator Internals & Controller Runtime | 1207 | 5 | Editorial reconstruction pending comparison with the full source text |
| 09 | Infrastructure GitOps & Platform Bootstrap | 1291 | 0 | Editorial reconstruction pending comparison with the full source text |
| 10 | Production Reliability & Progressive Delivery | 1245 | 6 | Editorial reconstruction pending comparison with the full source text |
| 11 | Kubernetes Observability & SRE Fundamentals | 1125 | 0 | Editorial reconstruction pending comparison with the full source text |
| 12 | Kubernetes Networking Internals | 1022 | 1 | Editorial reconstruction pending comparison with the full source text |
| 13 | GKE Networking & Cloud Load Balancing | 1060 | 1 | Editorial reconstruction pending comparison with the full source text |
| 14 | Service Mesh & Istio Internals | 1203 | 4 | Editorial reconstruction pending comparison with the full source text |
| 15 | Kubernetes Scheduling & Autoscaling | 1428 | 5 | Editorial reconstruction pending comparison with the full source text |
| 16 | Kubernetes Storage & Stateful Workloads | 1375 | 5 | Editorial reconstruction pending comparison with the full source text |
| 17 | High Availability & Disaster Recovery | 1343 | 0 | Editorial reconstruction pending comparison with the full source text |
| 18 | Kubernetes Security & Supply Chain | 1244 | 3 | Editorial reconstruction pending comparison with the full source text |
| 19 | Multi-Tenancy & Platform Governance | 1425 | 5 | Editorial reconstruction pending comparison with the full source text |

### Criteria for declaring the final version complete

1. Obtain a ChatGPT conversation export or the full text of the answers for Lessons 1–19. Compare each section with the source and record any differences.
2. Confirm the titles and content of Lessons 5–7 before publishing them as the original lessons.
3. Run `npm ci` and `npm run build`, then preview the site in an environment with the dependencies available.
4. Run `kubectl --dry-run=server` on runnable manifests with the corresponding CRDs and controllers available.
5. Run the labs end to end in `kind` or a GKE staging environment. Replace placeholder credentials and digests, and do not use production environments.
6. Verify sources and versions for each release so that deprecated guidance is not presented as current.

## Authoritative sources used to verify key changes

- [Argo CD current diff strategies](https://argo-cd.readthedocs.io/en/stable/user-guide/diff-strategies/)
- [Argo CD Upgrade 3.5 to 3.6](https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/3.5-3.6/)
- [Kubernetes Server-Side Apply](https://kubernetes.io/docs/reference/using-api/server-side-apply/)
- [Kubernetes HPA](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [Kubernetes VolumeSnapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [GKE autoscaler troubleshooting](https://cloud.google.com/kubernetes-engine/docs/troubleshooting/cluster-autoscaler-scale-up)
