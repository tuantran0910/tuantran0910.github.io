---
title: "Argo CD, Config Sync và Quản lý GKE Fleet"
description: "Chọn ranh giới reconciliation và tổ chức cấu hình Kubernetes trên nhiều cluster."
sidebar_position: 20
tags: [gitops, gke, config-sync]
---

## Chọn controller theo vai trò vận hành

Cả Argo CD và Config Sync đều reconcile tài nguyên Kubernetes từ các nguồn khai báo. Argo CD tổ chức công việc xoay quanh các **Application** và vòng đời phân phối của chúng. Config Sync tổ chức công việc xoay quanh các **nguồn cấu hình** cùng những cluster hoặc namespace tiếp nhận chúng. Cả hai đều có thể triển khai một `Deployment` hay một `NetworkPolicy`. Sự khác biệt về mặt vận hành sẽ rất quan trọng khi quyết định ai sở hữu từng đối tượng và cách đội vận hành chẩn đoán một đợt phát hành.

| Năng lực | Argo CD | Config Sync |
| --- | --- | --- |
| Đơn vị quản lý | `Application`; `ApplicationSet` có thể sinh ra nhiều Application | `RootSync` và `RepoSync` kết nối các nguồn cấu hình tới các reconciler |
| Vị trí thực thi | Application controller kết nối tới các cluster đích đã đăng ký | Các reconciler chạy trên từng cluster đã cấu hình |
| Nguồn và sinh manifest | YAML lưu trên Git, Helm chart, Kustomize và các nguồn được hỗ trợ khác | Nguồn Git, OCI hoặc Helm, với hành vi render phụ thuộc vào nguồn và cấu hình |
| Drift | Phép so sánh báo cáo drift; tự phục hồi (self-heal) có thể áp dụng lại trạng thái mong muốn | Các reconciler duy trì tài nguyên được quản lý; tùy chọn ngăn drift có thể từ chối các thay đổi xung đột |
| Trạng thái | Trạng thái sync, health, revision và lịch sử thao tác của Application | Các condition về nguồn, render và sync, danh mục tài nguyên và khả năng quan sát toàn fleet |
| Rollback | Revert Git hoặc dùng tính năng rollback của Application khi chính sách sync hỗ trợ | Revert hoặc ghim lại nguồn và để reconciler áp dụng revision tương ứng |
| Thứ tự triển khai | Các pha sync, hook và wave; ví dụ một Job di chuyển dữ liệu `PreSync` | Cấu hình tài nguyên và trạng thái reconciliation, với mô hình vận hành khác với hook của Argo CD |
| Phù hợp điển hình | Phân phối ứng dụng, kể cả xuyên nhiều cloud | Cấu hình dùng chung và quản trị cluster trên GKE |

Xem thêm [Tổng quan Config Sync](https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/overview), [Kiến trúc Config Sync](https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/concepts/architecture) và [Kiến trúc Argo CD](https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/).

## Một GKE Fleet gom nhóm những gì

Một Google Cloud **Fleet** gom nhóm các thành viên cluster Kubernetes đã đăng ký. **Quản lý Fleet** sử dụng nhóm đó cho việc quản trị chung, cấu hình tính năng và khả năng quan sát. Mỗi thành viên vẫn giữ nguyên Kubernetes API, workload, lưu trữ và vòng đời riêng. Đăng ký Fleet thiết lập một ranh giới quản lý. Việc phân bổ workload và cấu hình vẫn phụ thuộc vào các tính năng bạn bật và các nguồn bạn gán.

Hãy xét 10 cluster GKE chạy 30 dịch vụ: 3 cluster cho phát triển, 2 cluster cho staging và 5 cluster cho production. Cấu hình nền tảng dùng chung có thể định nghĩa namespace `payments`, resource quota, các `NetworkPolicy` mặc định và RBAC tiêu chuẩn. Cấu hình staging có thể nới rộng quota để kiểm thử tải trong khi production dùng một revision chính sách được phê duyệt riêng.

Gom cả 10 cluster vào một fleet là một phương án minh họa. Hãy rà soát niềm tin dùng chung và quyền sở hữu namespace trước tiên. Một số tính năng fleet coi các namespace trùng tên là tương đương về mặt logic giữa các cluster thành viên. Tách riêng fleet production và non-production có thể phản ánh tốt hơn các ranh giới tin cậy và vòng đời khác nhau. [Cách hoạt động của Fleet](https://docs.cloud.google.com/kubernetes-engine/fleet-management/docs/fleet-concepts)

## RootSync, RepoSync và ApplicationSet

- **RootSync** trỏ một root reconciler tới một nguồn cấu hình. Dùng nó cho các tài nguyên quản lý tập trung, bao gồm tài nguyên cấp cluster và nền tảng namespace dùng chung. Rà soát ai có quyền sửa nguồn và quyền thực tế của reconciler.
- **RepoSync** trỏ một namespace reconciler tới một nguồn cấu hình. Nó hỗ trợ ủy quyền trong phạm vi một namespace, tuân theo quyền Kubernetes của reconciler. Ví dụ, nhóm payments có thể tự duy trì cấu hình theo namespace của mình trong khi đội platform sở hữu namespace và các chính sách nền tảng.
- **ApplicationSet** sinh ra các Argo CD `Application`. Một cluster generator có thể chọn các cluster đã đăng ký với Argo CD theo nhãn như `environment=prod`. Các `Application` được sinh ra sẽ tham chiếu tới revision và đích mong muốn. Điều này giải quyết bài toán phân bổ ứng dụng đa cluster. Tư cách thành viên Fleet đến từ việc đăng ký trên Google Cloud. [ApplicationSet generators](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/)

## Bản đồ quyền sở hữu thống nhất cho nền tảng thanh toán

| Đối tượng mong muốn | Chủ sở hữu nguồn | Reconciler | Bằng chứng thành công |
| --- | --- | --- | --- |
| Cluster GKE và mạng nền tảng | Đội hạ tầng | Pipeline Terraform | Triển khai hạ tầng thành công và cluster đã đăng ký |
| Namespace, quota, chính sách mặc định, RBAC dùng chung | Đội platform | Config Sync | Revision nguồn như kỳ vọng và sync thành công trên các cluster được chọn |
| Custom Resource `StorageBucket` | Đội platform | Config Sync trên một cluster hạ tầng chỉ định | CR mong muốn tồn tại trong Kubernetes |
| Cloud Storage bucket thực tế | Đội platform | Config Connector | Status của CR phản ánh generation hiện tại và bucket tồn tại với thiết lập mong đợi |
| Deployment và Service của Payment | Nhóm Payments | Argo CD | Application ở trạng thái `Synced` và `Healthy` |

Chỉ triển khai khai báo bucket một lần thông qua một controller được chỉ định trừ khi mỗi đích cần cấp phát hạ tầng riêng biệt. Lặp lại cùng một CR trên mọi cluster trong fleet có thể khiến các controller độc lập cùng tác động lên một tài nguyên cloud. Tương tự, hai nguồn GitOps cùng sở hữu một đối tượng Kubernetes có thể bất đồng về các trường, danh mục và thao tác xóa. Hãy chỉ định một nguồn có thẩm quyền duy nhất trước khi bật dọn dẹp tự động. Một nền tảng quy mô nhỏ hơn có thể dùng Argo CD cho cả đối tượng ứng dụng lẫn đối tượng nền tảng bằng cách phân định rõ quyền sở hữu và ranh giới truy cập.

## Kiểm tra chỉ đọc (Read-only verification)

Dùng một cluster thử nghiệm đã cấu hình Config Sync và Argo CD. Chọn context tường minh khi cluster quản lý Argo CD khác với workload cluster.

```bash
kubectl --context gke-lab get rootsyncs -A
kubectl --context gke-lab get reposyncs -A
kubectl --context gke-lab -n payments get resourcequota,networkpolicy,rolebinding
argocd app get payment-prod
```

Nếu một chính sách bị thiếu, hãy xác nhận ba điều theo thứ tự: cluster đã nhận được cấu hình nguồn mong đợi, revision mong đợi đã render thành công và reconciler có quyền áp dụng đối tượng đó. Nếu quá trình rollout của payment bị đình trệ sau khi sync, hãy kiểm tra sức khỏe workload riêng, sau đó xác minh phần phụ thuộc cloud từ [Bài 05](./lesson-05-platform-integration.md). Các ví dụ trên sử dụng tên context và tên ứng dụng giữ chỗ.
