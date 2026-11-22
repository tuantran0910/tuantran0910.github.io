---
title: Thuật ngữ
description: Các thuật ngữ cốt lõi trong kỹ thuật nền tảng Kubernetes
---

| Thuật ngữ | Định nghĩa |
|---|---|
| Reconciliation | Vòng lặp điều khiển giúp controller đưa trạng thái thực tế tiến dần về trạng thái mong muốn. |
| CRD | Phần mở rộng API của Kubernetes cho phép định nghĩa các loại tài nguyên (resource kind) mới. |
| Finalizer | Cơ chế trì hoãn việc xóa tài nguyên cho đến khi quá trình dọn dẹp hoàn tất. |
| EndpointSlice | Tài nguyên API mô tả tập hợp các backend endpoint của một Service. |
| CSI | Giao diện chuẩn kết nối Kubernetes với các nhà cung cấp lưu trữ (storage provider). |
| NEG | Google Cloud Network Endpoint Group. |
| GitOps | Quản lý cấu hình mong muốn trong Git và áp dụng thông qua cơ chế reconciliation liên tục. |
| SLI / SLO | Service Level Indicator (Chỉ số mức dịch vụ) / Service Level Objective (Mục tiêu mức dịch vụ). |
| RPO / RTO | Recovery Point Objective (Mục tiêu điểm khôi phục) / Recovery Time Objective (Mục tiêu thời gian khôi phục). |
| mTLS | Mutual TLS — xác thực lẫn nhau cả hai đầu kết nối và mã hóa lưu lượng. |
| xDS | Các Discovery API dùng để phân phối cấu hình động tới các proxy (như Envoy). |
| Blast radius | Phạm vi các tài nguyên hoặc dịch vụ có thể bị ảnh hưởng bởi một sự cố. |
