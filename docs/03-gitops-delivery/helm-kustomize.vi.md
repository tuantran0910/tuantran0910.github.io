---
title: "Helm, Kustomize và Argo CD"
description: "Render cùng một ứng dụng bằng hai công cụ sinh manifest và theo dõi quyền sở hữu bản phát hành."
sidebar_position: 20
tags: [gitops, helm, kustomize, argocd]
---

## Ba thao tác trong một lần triển khai

**Render** chuyển đổi các tệp mã nguồn thành các Kubernetes manifest. **Apply** gửi các manifest đó lên Kubernetes API. **Reconcile** liên tục đối chiếu trạng thái mong muốn với trạng thái thực tế và hành động theo chính sách. Helm template và Kustomize overlay cung cấp hai cách render khác nhau. Argo CD chạy bộ sinh manifest tương ứng và sở hữu vòng lặp phân phối GitOps. Helm CLI cũng có thể apply manifest trực tiếp và ghi nhận một Helm release.

| Câu hỏi | Helm | Kustomize |
| --- | --- | --- |
| Nguồn đầu vào là gì? | Chart có phiên bản và các file values | Kubernetes YAML, một thư mục `base` và các `overlay` theo môi trường |
| Cấu hình thay đổi theo môi trường bằng cách nào? | Values được đưa vào Go template, có thể chứa điều kiện và vòng lặp | Các overlay kết hợp tài nguyên và chỉnh sửa chúng bằng transformer và patch |
| Tái sử dụng bằng cách nào? | Phát hành chart và khai báo các phụ thuộc (dependencies) | Tái sử dụng một `base` trong một hoặc nhiều `overlay` |
| Xem trước (preview) bằng cách nào? | `helm template` | `kubectl kustomize` |
| Triển khai trực tiếp bằng cách nào? | `helm install` hoặc `helm upgrade` tạo mới hoặc cập nhật một release | `kubectl apply -k` áp dụng các đối tượng đã dựng |

[Helm charts](https://helm.sh/docs/topics/charts/) · [Kustomize](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/)

## Render một Helm chart

Tạo một thư mục chart tên là `payment-chart`. Đặt nội dung sau vào `Chart.yaml`:

```yaml
apiVersion: v2
name: payment-service
version: 0.1.0
```

Đặt cấu hình mặc định vào `values.yaml`:

```yaml
replicaCount: 1
image:
  repository: nginx
  tag: "1.27"
resources:
  cpuRequest: 100m
```

Đặt các giá trị ghi đè cho môi trường production vào `values-prod.yaml`:

```yaml
replicaCount: 5
resources:
  cpuRequest: 500m
```

Đặt nội dung sau vào `templates/deployment.yaml`. Nginx đóng vai trò workload minh họa cho ví dụ này.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
        - name: payment
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          resources:
            requests:
              cpu: {{ .Values.resources.cpuRequest | quote }}
```

```bash
helm template payment-prod ./payment-chart -n production \
  -f ./payment-chart/values-prod.yaml
```

Deployment sau khi render cần có 5 replica và mức CPU request là `500m`. Nó kế thừa thông tin image từ file values mặc định. Chạy lại cùng lệnh trên mà không truyền file values production sẽ render ra 1 replica. Namespace đích được truyền vào ở thời điểm triển khai cho chart này vì template của nó không khai báo sẵn `metadata.namespace`.

## Xây dựng môi trường tương đương bằng Kustomize

Tạo `payment-service/base/deployment.yaml` sử dụng kết quả Deployment mặc định vừa render từ ví dụ chart làm điểm khởi đầu. Đó là một file YAML thông thường với `replicas: 1`, `image: nginx:1.27` cùng selector và Pod label khớp nhau. File `kustomization.yaml` ở thư mục `base` tham chiếu tới Deployment đó:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
```

Tạo `payment-service/overlays/dev/kustomization.yaml` với cùng `apiVersion` và `kind`, mục `resources` trỏ tới `../../base`, và `namespace: development`. Tạo `payment-service/overlays/prod/kustomization.yaml` như sau:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: production
replicas:
  - name: payment-service
    count: 5
images:
  - name: nginx
    newTag: "1.28"
patches:
  - target:
      kind: Deployment
      name: payment-service
    patch: |-
      - op: replace
        path: /spec/template/spec/containers/0/resources/requests/cpu
        value: 500m
```

```bash
kubectl kustomize payment-service/overlays/dev
kubectl kustomize payment-service/overlays/prod
```

Kết quả build cho production khai báo `namespace: production`, 5 replica, image tag mới và mức CPU request của production. Bản build cho development kế thừa số replica và image từ `base`. Một strategic merge patch có tên (named strategic merge patch) thường được ưu tiên hơn cho danh sách container nếu thứ tự trong danh sách có thể thay đổi. JSON patch ở đây dùng chỉ số `0` vì Deployment ví dụ chỉ có duy nhất một container.

## Cung cấp một nguồn ứng dụng duy nhất cho Argo CD

Sử dụng một bản cài đặt Argo CD thử nghiệm và thay URL repository bằng repository chứa các tệp ví dụ của bạn. Đích triển khai bên dưới là chính cluster đang chạy Argo CD. Application này dùng chế độ sync thủ công để bạn có thể kiểm tra bản diff đầu tiên.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-prod
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/example/platform-config.git
    targetRevision: main
    path: payment-chart
    helm:
      valueFiles:
        - values-prod.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    syncOptions:
      - CreateNamespace=true
```

Đối với biến thể Kustomize, hãy đặt `spec.source.path` thành `payment-service/overlays/prod` và bỏ khối `spec.source.helm`. Repo server sẽ phát hiện `kustomization.yaml` và tự chạy Kustomize build. Chỉ chọn một trong hai biến thể cho bài thực hành vì cả hai sẽ cùng quản lý chung một Deployment. Khi bạn commit thay đổi từ 5 replica lên 8 replica, hãy refresh Application và kiểm tra `argocd app diff payment-prod`. Sau khi sync, so sánh live Deployment spec và trạng thái rollout. Xem [Bài 01](../01-foundations/lesson-01-foundations.md) để tìm hiểu về auto-sync, self-heal và jitter.

Nếu một Helm chart bên thứ ba cần một bản vá mà các tham số values không hỗ trợ, một lựa chọn là sử dụng tích hợp `helmCharts` của Kustomize để chạy bước render Helm ngay trong quá trình Kustomize build. Argo CD cần bật `--enable-helm` trong tùy chọn Kustomize build tương ứng hoặc cấu hình một Config Management Plugin phù hợp. Tùy chọn toàn cục sẽ ảnh hưởng tới mọi ứng dụng Kustomize dùng chung tùy chọn đó. Hãy pin phiên bản chart và xem kỹ bản diff sau khi render trước khi nâng cấp. [Argo CD Helm support](https://argo-cd.readthedocs.io/en/stable/user-guide/helm/) · [Argo CD Kustomize support](https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/)

## Theo dõi một Helm release qua quá trình cài đặt và rollback

Một chart là một gói có thể tái sử dụng. Một **release** là một bản cài đặt có tên của chart, nằm trong phạm vi một namespace. Một **revision** là một mục được đánh số trong lịch sử của release đó. Cài đặt cùng một chart dưới hai tên `payment-staging` và `payment-prod` sẽ tạo ra hai lịch sử tách biệt. Với backend lưu trữ Secret mặc định của Helm, các bản ghi release xuất hiện trong namespace của release với tên dạng `sh.helm.release.v1.payment-prod.v1`. Các bản ghi này chứa metadata của release, chart cùng values và các manifest đã render. Quyền đọc các bản ghi này có thể làm lộ giá trị values, vì vậy hãy hạn chế quyền truy cập và không đặt thông tin xác thực dạng văn bản thuần trong file values.

| Lệnh | Kết quả trong ví dụ này |
| --- | --- |
| `helm install` | Revision 1 sử dụng cấu hình ban đầu |
| Lệnh `helm upgrade` lần thứ nhất | Revision 2 sử dụng cấu hình kế tiếp |
| Lệnh `helm upgrade` lần thứ hai | Revision 3 sử dụng cấu hình mới nhất |
| `helm rollback payment-prod 1 -n production` | Revision 4 áp dụng lại cấu hình từ revision 1 |

Lịch sử release là nhật ký của riêng Helm về các thao tác nó đã thực hiện. Nếu ai đó scale Deployment thủ công, live spec có thể thay đổi mà không phát sinh thêm Helm revision mới. Helm CLI không chạy vòng lặp điều khiển liên tục. [Using Helm](https://helm.sh/docs/intro/using_helm/) · [Helm rollback](https://helm.sh/docs/helm/helm_rollback/)

Trong một namespace tách biệt có release được quản lý qua CLI, hãy kiểm tra ba góc nhìn sau:

```bash
helm history payment-prod -n production
helm get values payment-prod -n production
helm get manifest payment-prod -n production
```

Một Argo CD Helm Application sử dụng bước render của Helm kết hợp với cơ chế sync của Argo CD. Hãy kiểm tra quá trình triển khai của nó qua `argocd app get` và `argocd app history`. Việc đặt `releaseName` trong cấu hình Helm chỉ thay đổi đầu vào cho template chứ không tạo ra bản ghi release của Helm CLI. Trong GitOps, hãy revert commit gốc để khôi phục trạng thái mong muốn trước đó. Thao tác rollback theo lịch sử của Argo CD phụ thuộc vào policy và không khả dụng khi automated sync đang được bật. Việc rollback cấu hình cũng để lại dữ liệu ứng dụng và các hệ quả của migration cơ sở dữ liệu cho quy trình khôi phục riêng của chúng. [Argo CD Helm](https://argo-cd.readthedocs.io/en/stable/user-guide/helm/) · [Automated sync](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)

Thử sử dụng [công cụ chuyển đổi môi trường tương tác](./gitops-exercises.mdx#render-an-environment), sau đó triển khai cả hai biến thể trong [bài thực hành GitOps với Argo CD](./gitops-lab.md).

## Kiểm tra các ranh giới

1. Quá trình render Helm trả về 5 replica trong khi cluster vẫn đang có 1. Bước nào làm thay đổi cluster?
2. Một GitOps Application báo cáo `Synced` trong khi các Pod vẫn đang trong quá trình rollout. Trạng thái nào mô tả quá trình rollout đó?
3. Một Argo CD Application sử dụng một Helm chart, nhưng `helm list` không báo cáo release nào. Bạn cần kiểm tra lịch sử của nó ở đâu?

Thao tác apply hoặc sync ghi spec lên cluster, trạng thái health của Application theo dõi quá trình rollout, và Argo CD ghi nhận lịch sử cho các Application mà nó quản lý. Các manifest và lệnh cluster ở đây là ví dụ phục vụ học tập. Hãy chạy lệnh xem trước kết quả render trước khi apply lên một cluster thử nghiệm dùng một lần.
