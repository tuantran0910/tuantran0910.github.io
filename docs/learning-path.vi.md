---
id: learning-path
title: Lộ trình học tập — 19 bài học
sidebar_position: 1
---

Học các bài theo thứ tự hoặc nhảy thẳng tới chủ đề bạn cần. Mỗi bài học bao gồm kiến trúc hệ thống, manifest thực tế, các tình huống lỗi production và hướng dẫn kiểm chứng thực hành.

01. **[Bài 01: Kiến trúc nội bộ Argo CD & Cơ chế Reconciliation](./01-foundations/lesson-01-foundations.md)** — Kiến trúc bên trong Argo CD, trạng thái mong muốn trong GitOps, application controller, repo server, live-state cache, sync, hooks và drift.
02. **[Bài 02: Kubernetes Server-Side Apply, Quyền sở hữu trường & Xử lý xung đột](./01-foundations/lesson-02-core-resources.md)** — Server-Side Apply, managedFields, field managers, three-way merge và conflict resolution.
03. **[Bài 03: Structured Merge Diff, OpenAPI Schema & Quyền sở hữu trường](./01-foundations/lesson-03-cluster-architecture.md)** — Structured Merge Diff, Kubernetes schema, ngữ nghĩa danh sách (atomic/map/set) và field ownership.
04. **[Bài 04: Argo CD ApplicationSet & GitOps Đa Cluster](./02-controllers-platform/lesson-04-controller-foundations.md)** — ApplicationSet generators, templating, triển khai đa cluster và bootstrap.
05. **[Bài 05: Config Connector, Config Sync & Reconciliation Tài nguyên Cloud](./02-controllers-platform/lesson-05-platform-integration.md)** — CRD hạ tầng Google Cloud, Config Sync và phân định quyền sở hữu controller.
06. **[Bài 06: GKE Workload Identity Federation & External Secrets](./02-controllers-platform/lesson-06-workload-identity-secrets.md)** — Workload Identity Federation, IAM, External Secrets Operator (ESO) và Secret Manager.
07. **[Bài 07: Kubernetes Admission Controllers & Chính sách](./02-controllers-platform/lesson-07-admission.md)** — Mutating và Validating admission, webhooks và chính sách CEL.
08. **[Bài 08: Kiến trúc nội bộ Kubernetes Operator & Controller Runtime](./02-controllers-platform/lesson-08-operators.md)** — CRDs, vòng lặp reconciliation, controller-runtime, finalizers và status conditions.
09. **[Bài 09: Infrastructure GitOps & Platform Bootstrap](./03-gitops-delivery/lesson-09-gitops-bootstrap.md)** — Terraform, Argo CD App-of-Apps, ApplicationSet và ranh giới sở hữu controller.
10. **[Bài 10: Độ tin cậy Production & Progressive Delivery](./03-gitops-delivery/lesson-10-progressive-delivery.md)** — RollingUpdate, canary release, blue-green deployment, Argo Rollouts và AnalysisTemplate.
11. **[Bài 11: Kubernetes Observability & Nền tảng SRE](./04-observability/lesson-11-observability.md)** — Prometheus, OpenTelemetry, RED, USE, SLI, SLO và error budget.
12. **[Bài 12: Kiến trúc nội bộ Kubernetes Networking](./05-networking/lesson-12-kubernetes-networking.md)** — CNI, Service, EndpointSlice, kube-proxy/eBPF, DNS và NetworkPolicy.
13. **[Bài 13: GKE Networking & Cloud Load Balancing](./05-networking/lesson-13-gke-networking.md)** — Alias IP, NEG, GKE Gateway, Cloud NAT và private cluster.
14. **[Bài 14: Service Mesh & Kiến trúc nội bộ Istio](./05-networking/lesson-14-istio.md)** — Envoy, istiod, xDS, mTLS, VirtualService và Ambient Mesh.
15. **[Bài 15: Kubernetes Scheduling & Autoscaling](./06-compute-storage/lesson-15-scheduling.md)** — Scheduler Filter & Score, requests/limits, HPA, VPA và GKE autoscaling.
16. **[Bài 16: Kubernetes Storage & Stateful Workloads](./06-compute-storage/lesson-16-storage.md)** — PVC, PV, StorageClass, CSI, StatefulSet, GKE storage và VolumeSnapshot.
17. **[Bài 17: High Availability & Disaster Recovery](./07-reliability/lesson-17-disaster-recovery.md)** — Failure domains, HA/DR, regional GKE, RPO/RTO, backup và failover.
18. **[Bài 18: Bảo mật Kubernetes & Chuỗi cung ứng](./08-security-governance/lesson-18-security.md)** — Pod Security, RBAC, WIF, SBOM, SLSA, chữ ký số và admission control.
19. **[Bài 19: Multi-Tenancy & Quản trị Nền tảng](./08-security-governance/lesson-19-multi-tenancy.md)** — RBAC, ResourceQuota, NetworkPolicy, AppProject và self-service tenant.
