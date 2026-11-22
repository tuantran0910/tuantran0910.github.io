---
title: "Bài thực hành GitOps với Argo CD"
sidebar_position: 21
tags: [gitops, argocd, helm, kustomize]
---

## Những gì bạn sẽ kiểm chứng

Theo dõi một Deployment xuyên suốt từ bước render mã nguồn, so sánh trạng thái thực tế, đồng bộ (synchronization), rollout, tự phục hồi drift (drift repair) cho đến phân phối đa cluster (multi-cluster delivery). Bạn sẽ sử dụng một Argo CD control plane duy nhất. Ban đầu nó quản lý cluster cục bộ, sau đó một ApplicationSet sẽ tự động sinh ra một Application cho cluster thứ hai.

Bạn cần Docker đang chạy, `kind`, `kubectl`, Helm, Argo CD CLI và một Git repository mà repo server có thể truy cập được. Hãy sử dụng một repository và các cluster dành riêng cho bài lab. Sao chép toàn bộ cây thư mục chart và Kustomize từ bài [Helm, Kustomize và Argo CD](./helm-kustomize.md) vào repository và đẩy lên nhánh `main`. Thay thế URL repository ví dụ trong suốt bài lab này. Với repository riêng tư (private), hãy cấu hình thông tin xác thực repository của Argo CD bên ngoài cây thư mục Git.

## 1. Bootstrap management cluster

Chọn một bản phát hành Argo CD được hỗ trợ và sử dụng cùng một phiên bản cho cả server lẫn CLI. Thay `vX.Y.Z` bên dưới bằng tag phát hành đó. Luôn chỉ rõ cluster context trong các câu lệnh.

```bash
kind create cluster --name gitops-lab
kubectl --context kind-gitops-lab create namespace argocd
ARGOCD_VERSION=vX.Y.Z
kubectl --context kind-gitops-lab -n argocd apply --server-side \
  -f "https://raw.githubusercontent.com/argoproj/argo-cd/${ARGOCD_VERSION}/manifests/install.yaml"
kubectl --context kind-gitops-lab -n argocd rollout status deployment/argocd-server
kubectl --context kind-gitops-lab -n argocd port-forward svc/argocd-server 8080:443
```

Giữ cho lệnh port-forward tiếp tục chạy. Ở một cửa sổ terminal khác, chạy `kubectl --context kind-gitops-lab -n argocd get secret argocd-initial-admin-secret -o go-template='{{.data.password | base64decode}}{{"\n"}}'` để lấy mật khẩu ban đầu cục bộ. Chạy `argocd login localhost:8080 --username admin --insecure` và nhập mật khẩu khi được hỏi. Cờ `--insecure` chỉ dùng cho endpoint lab cục bộ sử dụng chứng chỉ tự ký này. [Argo CD getting started](https://argo-cd.readthedocs.io/en/stable/getting_started/) · [kind quick start](https://kind.sigs.k8s.io/docs/user/quick-start/)

## 2. Thiết lập baseline và phát hành một revision mới

Lưu Helm Application từ bài hướng dẫn đi kèm dưới tên `payment-prod.yaml`, sau đó apply lên management cluster. Giữ chế độ sync thủ công cho giai đoạn này.

```bash
kubectl --context kind-gitops-lab apply -f payment-prod.yaml
argocd app get payment-prod --refresh
argocd app diff payment-prod
argocd app sync payment-prod
argocd app wait payment-prod --sync --health --timeout 180
kubectl --context kind-gitops-lab -n production get deployment payment-service
```

Trước lần sync đầu tiên, Application sẽ liệt kê một Deployment chưa tồn tại (missing) hoặc ở trạng thái `OutOfSync`. Sau khi sync và rollout xong, kết quả kỳ vọng là 5 desired replicas và 5 available replicas. Nếu Application báo lỗi so sánh (comparison error), hãy kiểm tra URL nguồn, nhánh, thông tin xác thực repository, đường dẫn chart và tên file values. Nếu Application ở trạng thái `Synced` nhưng không khỏe mạnh (unhealthy), hãy dùng `kubectl describe deployment` và kiểm tra Pod events để tìm lỗi lập lịch hoặc lỗi tải image.

Trong file `payment-chart/values-prod.yaml`, thêm phần ghi đè image:

```yaml
image:
  tag: "1.28"
```

Commit và đẩy thay đổi lên Git. Refresh Application, ghi lại revision vừa phát hiện và so sánh image mong muốn với Deployment đang chạy. Chế độ sync thủ công sẽ giữ nguyên image cũ đang chạy cho đến khi bạn gọi `argocd app sync payment-prod`. Sau khi sync, chạy `kubectl --context kind-gitops-lab -n production rollout status deployment/payment-service` để xác nhận Kubernetes đã hoàn tất thay thế các Pod. Lệnh `argocd app history payment-prod` hiển thị lịch sử triển khai.

## 3. Quan sát drift khi tắt và bật self-heal

Bật automated sync nhưng tắt self-heal, sau đó chờ Application đồng bộ xong tại Git revision hiện tại.

```bash
kubectl --context kind-gitops-lab -n argocd patch application payment-prod \
  --type merge -p '{"spec":{"syncPolicy":{"automated":{"selfHeal":false}}}}'
kubectl --context kind-gitops-lab -n production scale deployment/payment-service --replicas=2
argocd app get payment-prod --refresh
argocd app diff payment-prod
```

Với Application một nguồn (single-source) này và một revision không đổi đã được sync trước đó, bản diff kỳ vọng sẽ cho thấy trạng thái mong muốn là 5 so với thực tế đang chạy là 2. Ghi nhận số replica này, sau đó bật self-heal:

```bash
kubectl --context kind-gitops-lab -n argocd patch application payment-prod \
  --type merge -p '{"spec":{"syncPolicy":{"automated":{"selfHeal":true}}}}'
argocd app wait payment-prod --sync --health --timeout 180
kubectl --context kind-gitops-lab -n production get deployment payment-service
```

Kỳ vọng số desired replica quay trở lại 5. Nếu không thấy drift, hãy kiểm tra xem có HPA, quy tắc bỏ qua trường (field ignore rule) hay một tác nhân ghi khác không. Nếu drift vẫn tồn tại, hãy kiểm tra các condition của Application, trạng thái thao tác gần nhất (last operation state), quyền trên cluster đích và sync policy. Tiếp theo, commit `replicaCount: 6` một lần và quan sát auto-sync áp dụng thay đổi xuất phát từ Git. Ghi nhận cả revision lẫn thời điểm các Pod chuyển sang trạng thái ready. [Automated sync semantics](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)

## 4. Chuyển chính Application đó sang Kustomize

Chỉnh sửa file Application manifest cục bộ để trỏ tới `payment-service/overlays/prod`, xóa khối `helm` của nó và apply lại. Giữ nguyên tên Application và đích triển khai. Xác nhận overlay render ra cùng tên Deployment và selector trước khi apply. Kiểm tra bản diff, sync thủ công nếu automated sync đang tắt, và xác minh số replica cũng như image từ overlay. Kiểm tra chắc chắn rằng chỉ có duy nhất một Argo CD Application sở hữu Deployment trong namespace này. So sánh các manifest đã render trước khi chuyển đổi để bạn có thể phân biệt giữa thay đổi do công cụ sinh manifest và thay đổi thực sự trong workload mong muốn.

## 5. Sinh một Application cho cluster thứ hai

Tạo một cluster thứ hai trên cùng mạng Docker `kind`. Sử dụng địa chỉ Docker nội bộ của node cho kết nối API từ controller. File kubeconfig trên máy host của `kind` thường khai báo endpoint loopback, vốn sẽ trỏ ngược về chính controller Pod nếu dùng bên trong Pod đó.

```bash
kind create cluster --name gitops-target
TARGET_IP=$(docker inspect -f '{{(index .NetworkSettings.Networks "kind").IPAddress}}' gitops-target-control-plane)
TARGET_SERVER="https://${TARGET_IP}:6443"
```

Bài lab dùng một lần này tạo một ServiceAccount riêng có quyền toàn cluster để Argo CD có thể khám phá tài nguyên và tạo namespace đích. Với các cluster vận hành lâu dài, hãy giới hạn quyền và áp dụng vòng đời thông tin xác thực phù hợp. Kubernetes điền dữ liệu cho token Secret một cách bất đồng bộ. Hãy kiểm tra để chắc chắn Secret chứa cả `token` và `ca.crt` trước khi tạo đăng ký cluster.

```bash
kubectl --context kind-gitops-target -n kube-system create serviceaccount gitops-lab-argo
kubectl --context kind-gitops-target create clusterrolebinding gitops-lab-argo \
  --clusterrole=cluster-admin --serviceaccount=kube-system:gitops-lab-argo
kubectl --context kind-gitops-target apply -f - <<'YAML'
apiVersion: v1
kind: Secret
metadata:
  name: gitops-lab-argo-token
  namespace: kube-system
  annotations:
    kubernetes.io/service-account.name: gitops-lab-argo
type: kubernetes.io/service-account-token
YAML
kubectl --context kind-gitops-target -n kube-system get secret gitops-lab-argo-token \
  -o go-template='{{range $key, $_ := .data}}{{$key}}{{"\n"}}{{end}}'
```

Chạy đoạn lệnh sau khi đã tắt shell tracing. Token được truyền qua luồng đầu vào chuẩn (standard input) tới Kubernetes client cục bộ. Tránh in ra màn hình hoặc commit bất kỳ registration Secret nào lên Git.

```bash
register_target() {
  local target_token target_ca
  target_token=$(kubectl --context kind-gitops-target -n kube-system get secret gitops-lab-argo-token \
    -o go-template='{{if index .data "token"}}{{index .data "token" | base64decode}}{{end}}') || return 1
  target_ca=$(kubectl --context kind-gitops-target -n kube-system get secret gitops-lab-argo-token \
    -o go-template='{{index .data "ca.crt"}}') || return 1
  if [ -z "$TARGET_IP" ] || [ -z "$target_token" ] || [ -z "$target_ca" ]; then
    printf 'Target address or credentials are pending. Verify the Docker network and Secret, then retry.\n' >&2
    return 1
  fi
  printf '{"bearerToken":"%s","tlsClientConfig":{"insecure":false,"caData":"%s"}}' "$target_token" "$target_ca" |
    kubectl --context kind-gitops-lab -n argocd create secret generic gitops-target-registration \
      --from-literal=name=gitops-target --from-literal=server="$TARGET_SERVER" --from-file=config=/dev/stdin || return 1
  kubectl --context kind-gitops-lab -n argocd label secret gitops-target-registration \
    argocd.argoproj.io/secret-type=cluster gitops-lab-target=true
}
register_target
kubectl --context kind-gitops-lab -n argocd get secrets \
  -l argocd.argoproj.io/secret-type=cluster
argocd cluster list
```

Nếu kết nối thất bại, hãy xác minh địa chỉ IP có thể truy cập được từ management cluster và có nằm trong mục subject alternative names (SAN) của chứng chỉ API cluster đích hay không. Trên một runtime hoặc cấu trúc mạng khác, hãy sử dụng một endpoint được chứng chỉ bao phủ và controller có thể kết nối tới. [Declarative cluster registration](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#clusters) · [ServiceAccount credentials](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)

Apply ApplicationSet sau vào management cluster:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: payment-lab-targets
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - clusters:
        selector:
          matchLabels:
            gitops-lab-target: "true"
  template:
    metadata:
      name: '{{.nameNormalized}}-payment'
    spec:
      project: default
      source:
        repoURL: https://github.com/example/platform-config.git
        targetRevision: main
        path: payment-service/overlays/prod
      destination:
        server: '{{.server}}'
        namespace: production
      syncPolicy:
        syncOptions:
          - CreateNamespace=true
```

Kỳ vọng sẽ thấy đúng một Application được sinh ra bên cạnh `payment-prod`. Kiểm tra cluster đích của nó và tiến hành sync. Xác minh lệnh `kubectl --context kind-gitops-target -n production get deployment payment-service` hiển thị Deployment trên cluster thứ hai. Nếu ApplicationSet không sinh ra Application nào, hãy kiểm tra các condition của nó và label trên cluster Secret. Nếu nó sinh ra Application nhưng không thể so sánh hoặc sync, hãy kiểm tra kết nối mạng, độ tin cậy chứng chỉ (certificate trust) và thông tin xác thực tới cluster đích. [ApplicationSet cluster generator](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/)

## Kiểm tra đầu ra và rollback

- Ghi nhận source revision và image trước và sau khi sync.
- Giải thích lý do vì sao một Application có thể báo cáo `Synced` trong khi rollout vẫn đang diễn ra.
- Ghi nhận cả hai kết quả của bài kiểm thử scale và sync policy được sử dụng trong mỗi trường hợp.
- Xác minh từng Deployment bằng đúng cluster context của nó.
- Revert một commit của bài lab, sau đó sync các Application bị ảnh hưởng và xác nhận image hoặc số replica mong muốn trước đó đã được khôi phục.
- Dừng lệnh port-forward sau khi hoàn tất. Khi đã thu thập xong kết quả, chỉ xóa các cluster `kind` dùng một lần mà bạn đã tạo cho bài lab này.
