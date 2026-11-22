---
title: Chỉ mục Xử lý sự cố
---

| Triệu chứng | Bắt đầu từ đây |
|---|---|
| `Pending` do thiếu CPU hoặc không thỏa mãn luật affinity | [Scheduling](../06-compute-storage/lesson-15-scheduling.md) |
| PVC `Pending` / `FailedAttachVolume` | [Storage](../06-compute-storage/lesson-16-storage.md) |
| Service không có backend | [Networking](../05-networking/lesson-12-kubernetes-networking.md) |
| Backend của Cloud Load Balancer báo unhealthy | [GKE Networking](../05-networking/lesson-13-gke-networking.md) |
| Istio trả `503` / lỗi không khớp mTLS | [Istio](../05-networking/lesson-14-istio.md) |
| Pod bị `OOMKilled` / CPU throttling | [Scheduling](../06-compute-storage/lesson-15-scheduling.md) |
| Canary bị abort hoặc degraded | [Progressive Delivery](../03-gitops-delivery/lesson-10-progressive-delivery.md) |
| Mất zone / split-brain | [Disaster Recovery](../07-reliability/lesson-17-disaster-recovery.md) |
