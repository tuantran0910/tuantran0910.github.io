---
title: "Thiết kế kho lưu trữ GitOps và Promote môi trường"
sidebar_position: 22
tags: [gitops, argocd, helm, kustomize]
---

## Tách biệt quá trình build ứng dụng khỏi quyết định triển khai

Một nền tảng với 30 microservice có thể build image nhiều lần mỗi ngày trong khi vẫn phát hành lên production một cách có chủ đích. Môi trường development có thể theo sát thay đổi development mới nhất đã được phê duyệt. Môi trường staging xác minh chính xác bản ứng viên (candidate) mà production có thể tiếp nhận. Cấu hình production chỉ thay đổi khi bằng chứng phát hành và quy trình phê duyệt cho phép promote bản ứng viên đó.

Trạng thái mong muốn của ứng dụng bao gồm image, số lượng replica và cấu hình runtime. Trạng thái mong muốn của nền tảng bao gồm namespace, policy dùng chung, khai báo hạ tầng và các dịch vụ cấp cluster. Mỗi phần có chủ sở hữu và lộ trình phê duyệt riêng. Việc phát hành một image mới chỉ ghi nhận một bản ứng viên trong registry. Cấu hình triển khai mới là thứ quyết định môi trường nào được phép chạy bản đó.

| Tác nhân | Trách nhiệm | Bằng chứng hoặc đầu ra |
| --- | --- | --- |
| Lập trình viên | Review và merge các thay đổi ứng dụng | Source commit và code review |
| CI | Kiểm thử, build, quét bảo mật và xuất bản một OCI image | Digest, kết quả kiểm thử, báo cáo lỗ hổng và tùy chọn SBOM, chữ ký (signing) cùng provenance |
| Container registry | Lưu trữ và phân phối nội dung đã xuất bản | Image tag và content digest |
| Chủ sở hữu môi trường | Phê duyệt thay đổi cấu hình triển khai mong muốn | Một GitOps commit định danh rõ artifact và môi trường |
| Argo CD | Render, so sánh, sync và phát hiện drift | Revision quan sát được, trạng thái sync và kết quả thao tác |
| Kubernetes controllers | Hiện thực hóa workload spec đã gửi lên | Trạng thái rollout và trạng thái runtime |

CI có thể xuất bản image và mở một PR vào GitOps repository mà không cần thông tin xác thực Kubernetes của production. Argo CD sử dụng danh tính có phạm vi riêng để triển khai trạng thái đã được phê duyệt. Do đó, quyền merge mã nguồn của lập trình viên hoàn toàn độc lập với quyền phê duyệt phát hành lên production. [Argo CD best practices](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/#separating-config-vs-source-code-repositories)

```text
payment-service/                  platform-gitops/
├── src/                          ├── charts/
├── tests/                        ├── environments/
├── Dockerfile                    ├── argocd/applicationsets/
├── go.mod                        ├── argocd/projects/
└── .github/workflows/ci.yaml      └── policies/
```

Một source commit như `feat: support partial refunds` sẽ kích hoạt kiểm thử và build. Một configuration commit như `chore(prod): promote payment to v1.5.0` cấp phép cho một thay đổi đối với trạng thái mong muốn trên production. Việc tách biệt hai lịch sử này cũng cho phép bạn thay đổi số replica hoặc policy mà không cần build lại image ứng dụng.

### Lựa chọn ranh giới cho repository cấu hình

Tách mã nguồn khỏi cấu hình là một quyết định. Chọn một hay nhiều **repository cấu hình** lại là một quyết định khác.

| Mô hình | Điểm mạnh | Đánh đổi |
| --- | --- | --- |
| Một monorepo cấu hình cho cả ứng dụng và nền tảng | Dùng chung quy ước chart và overlay, dễ tìm kiếm tập trung và phối hợp thay đổi trong một PR duy nhất | Nhiều nhóm dùng chung ranh giới review và phân quyền truy cập. Thay đổi ở các đầu vào dùng chung có thể ảnh hưởng tới nhiều Application. |
| Repository cấu hình riêng theo nhóm, domain hoặc ranh giới nền tảng | Các nhóm có thể vận hành với quyền truy cập, quyền sở hữu, nhịp độ phát hành và Git credentials tách biệt | Các thay đổi xuyên repository cần sự phối hợp và kiểm tra tương thích tường minh. |

Với một nền tảng quy mô nhỏ, một repository cấu hình tách riêng khỏi các repository mã nguồn dịch vụ giúp đơn giản hóa quá trình onboarding. Hãy tách repository cấu hình khi một nhóm hoặc một domain nền tảng cần ranh giới tin cậy (trust boundary) riêng. Cơ chế review theo đường dẫn và `CODEOWNERS` có thể bắt buộc phê duyệt từ chủ sở hữu trong một repository dùng chung. Sử dụng các repository tách biệt khi bản thân quyền đọc hoặc ghi cần mức độ cô lập cao hơn.

Repository ứng dụng sở hữu mã nguồn, kiểm thử và quá trình build image. Repository triển khai có thể sở hữu các manifest theo từng môi trường và các tham chiếu image bất biến mà Argo CD sử dụng. Một monorepo cũng có thể đạt được sự tách biệt tương tự thông qua phân quyền sở hữu thư mục và quy tắc review. Repository riêng hữu ích khi production có yêu cầu phê duyệt hoặc quyền đọc khác biệt. Monorepo giúp đơn giản hóa các thay đổi phối hợp giữa chart, overlay và mã nguồn ứng dụng. Trong cả hai trường hợp, hãy xác định rõ nguồn có thẩm quyền (authoritative source) cho từng đối tượng và kiểm soát chặt quyền truy cập vào các cấu hình có khả năng tạo tài nguyên cấp cluster.

```text
platform-config/
├── charts/payment-service/
├── environments/
│   ├── dev/payment-values.yaml
│   ├── staging/payment-values.yaml
│   └── prod/payment-values.yaml
└── argocd/
    ├── applications/
    └── applicationsets/
```

Với một chart lưu trong Git, một bố cục đơn giản là đặt `values-dev.yaml`, `values-staging.yaml` và `values-prod.yaml` ngay cạnh chart. Trỏ từng Application tới đường dẫn chart và chọn đúng một file values. Nếu các file values nằm ở một repository riêng, hãy sử dụng tính năng hỗ trợ nhiều nguồn (multiple-source) của Argo CD và cấu hình tường minh nguồn values cùng revision của nó. Với Kustomize, trỏ từng Application tới `overlays/dev`, `overlays/staging` hoặc `overlays/prod` và giữ các manifest dùng chung trong `base`. Một `AppProject` có thể giới hạn các nguồn và đích được phép sử dụng. [Argo CD Helm values](https://argo-cd.readthedocs.io/en/stable/user-guide/helm/) · [Multiple sources](https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/)

## Chọn Helm values cho từng môi trường

Một chart dùng chung mô tả những đối tượng Kubernetes nào sẽ được render. Các file values theo môi trường cung cấp những điểm khác biệt như số replica và mức log. Một `Application` hoặc [ApplicationSet](../02-controllers-platform/lesson-04-controller-foundations.md) quyết định nơi đầu ra sẽ được triển khai. Chart phải thực sự tiêu thụ các giá trị bạn khai báo, bao gồm cả cấu hình log level.

```yaml
# environments/dev/payment-values.yaml
replicaCount: 1
image:
  repository: registry.example.com/payment
  tag: v1.5.0
config:
  logLevel: debug
```

```yaml
# environments/prod/payment-values.yaml
replicaCount: 5
image:
  repository: registry.example.com/payment
  tag: v1.4.2
config:
  logLevel: warn
```

Các file sử dụng tag trên giúp dễ nhìn thấy sự khác biệt giữa các môi trường. Hãy chuyển sang dạng sử dụng digest bên dưới cho quy trình promotion và cập nhật chart để render tham chiếu image dựa trên digest.

### Tải chart và values bằng Argo CD Multiple Sources

Application dưới đây đọc một chart lưu trên Git và một file values từ thư mục gốc của một nguồn Git được tham chiếu. Repository và cluster đích chỉ mang tính minh họa. Hãy đăng ký `gke-prod`, cho phép cả hai nguồn repository và đích triển khai trong `AppProject` có tên `payments`, đồng thời cấp cho danh tính đích các quyền cần thiết.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-prod
  namespace: argocd
spec:
  project: payments
  sources:
    - repoURL: https://github.com/example/platform-gitops.git
      targetRevision: main
      path: charts/payment-service
      helm:
        valueFiles:
          - $values/environments/prod/payment-values.yaml
    - repoURL: https://github.com/example/platform-gitops.git
      targetRevision: main
      ref: values
  destination:
    name: gke-prod
    namespace: payments
  syncPolicy:
    automated:
      prune: false
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Nguồn thứ nhất render chart. Nguồn thứ hai ánh xạ `$values` tới thư mục gốc của repository. Tham chiếu này phải đứng ở đầu đường dẫn của file values. Vì nguồn thứ hai không có `path`, nó chỉ cung cấp values mà không sinh thêm tài nguyên nào khác. Trong ví dụ này hai nguồn trỏ tới cùng một repository. Nếu chúng được tách sang hai repository khác nhau, vẫn cần duy trì hợp đồng cấu trúc values (values contract) và quyền truy cập tới cả hai repository. Với một Helm chart bên ngoài, hãy chọn chart và phiên bản phát hành bằng cú pháp nguồn Helm hoặc OCI tương ứng. [Argo CD Multiple Sources](https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/#helm-value-files-from-external-git-repository)

Một image digest chỉ pin artifact của workload; nó không pin chart, nguồn values hay một Kustomize base từ xa. Để tái lập chính xác một bản phát hành đã được phê duyệt, hãy ghi nhận revision đã phân giải của từng nguồn và pin các đầu vào cần giữ bất biến. Để xem trước chart đó ở máy cục bộ, chạy `helm template payment-prod ./charts/payment-service -f ./environments/prod/payment-values.yaml`. Với cấu trúc Kustomize, hãy build overlay của môi trường cụ thể và rà soát toàn bộ đầu ra của nó. [Argo CD immutable manifests guidance](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/#ensuring-manifests-at-git-revisions-are-truly-immutable)

## Promote cùng một image digest

CI build và xuất bản một image duy nhất một lần. Ghi lại digest do registry trả về, sau đó dùng chính digest bất biến đó trên cả ba môi trường. Digest bên dưới chỉ là giá trị giữ chỗ minh họa.

```yaml
image:
  repository: registry.example.com/payments/payment-service
  digest: sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

Điều chỉnh chart để hỗ trợ giá trị này. Một tham chiếu image được pin theo digest sẽ render thành dạng `repository@sha256:...`:

```text
image: "{{ .Values.image.repository }}@{{ .Values.image.digest }}"
```

Với biến thể Kustomize, thay thế digest trong overlay của môi trường:

```yaml
images:
  - name: registry.example.com/payments/payment-service
    digest: sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

Tên image trong overlay phải khớp với container image ở `base`. Hãy render môi trường mục tiêu và kiểm tra tham chiếu image đầy đủ trước khi merge. Development và production có thể khác nhau về số replica, tài nguyên và policy trong khi vẫn chạy cùng một artifact dịch vụ.

| Giai đoạn | Thay đổi trong repository | Bằng chứng cần thu thập |
| --- | --- | --- |
| Dev | Cập nhật dev digest sang artifact do CI tạo ra | Tham chiếu image sau khi render, trạng thái sync, kết quả smoke test |
| Staging | Sao chép dev digest đã được phê duyệt sang cấu hình staging | Đúng cùng digest đó, rollout khỏe mạnh, kết quả kiểm thử tích hợp |
| Production | Promote staging digest trong một production PR có review | Kết quả render hoặc diff đã được review, sync thành công, tín hiệu rollout và dịch vụ |

### Theo dõi danh tính artifact độc lập với Git revision

| Định danh | Ý nghĩa |
| --- | --- |
| `payment:latest` | Một tag có thể di chuyển khi registry cho phép gán lại. |
| `payment:v1.5.0` | Một nhãn phiên bản. Tính bất biến của nó phụ thuộc vào chính sách của registry. |
| `payment@sha256:…` | Một tham chiếu image định địa chỉ theo nội dung (content-addressed). Một SHA-256 digest đầy đủ có 64 ký tự thập lục phân sau tiền tố. |
| `targetRevision` | Git revision, nhánh hoặc phiên bản Helm chart mà Argo CD dùng để phân giải cấu hình. |

Nếu dev, staging và production tự build lại cùng một tag, chúng có thể tạo ra các digest khác nhau do sự khác biệt về dependency, môi trường build hoặc các tệp sinh tự động. Khi đó, kết quả kiểm thử trên dev image chỉ là bằng chứng cho dev digest. Hãy build một lần và promote cùng một digest đó. Cấu hình theo môi trường vẫn có thể khác nhau, bao gồm số replica, feature flag và các endpoint bên ngoài. Có thể giữ thêm tag làm metadata hiển thị nếu hữu ích và đảm bảo chính sách lưu giữ của registry (registry retention) vẫn giữ lại các digest đã triển khai trước đó để phục vụ rollback. [Kubernetes images](https://kubernetes.io/docs/concepts/containers/images/#image-names)

## Theo dõi một lần promotion và một lần rollback

1. Một PR của nhóm payments chỉ cập nhật dev digest. Sau khi merge, Argo CD render manifest cho dev và dev Application sẽ sync theo policy.
2. Khi các bài smoke test đạt, một staging PR sao chép chính xác digest vừa vượt qua dev. Xác minh staging Application theo đúng nhánh kỳ vọng và Deployment spec chứa đúng digest đó.
3. Production PR cập nhật production digest sau khi staging vượt qua kiểm thử. Review cả image lẫn toàn bộ manifest diff. Nếu bạn yêu cầu phê duyệt trước khi apply, hãy kết hợp phê duyệt trên repository với sync thủ công hoặc một sync policy phù hợp.
4. Nếu production cần rollback, hãy revert commit promote production và merge bản revert đó. Xác nhận Argo CD nhận diện Git revision vừa revert, render lại digest trước đó và apply nó. Kiểm tra sức khỏe rollout và các metric ứng dụng một cách tách biệt. Với một commit bị trộn lẫn các thay đổi không liên quan, hãy tạo một PR có mục tiêu chỉ khôi phục lại digest trước đó.
5. Ghi nhận digest đã promote, source revision và kết quả. Các đợt migration cơ sở dữ liệu và khôi phục dữ liệu có kế hoạch rollback riêng. Xác nhận image trước đó vẫn tương thích với schema hiện tại trước khi promote.

Một Git revision mới có thể render ra cùng một manifest giống hệt cho một môi trường không bị ảnh hưởng. Hãy kiểm tra manifest diff và workload rollout tách biệt với source revision. Ở những nơi cấu hình progressive delivery, bằng chứng có thể bao gồm kết quả phân tích và các metric canary từ bài [Progressive Delivery](./lesson-10-progressive-delivery.md). Thực hành quy trình này với [bài thực hành GitOps với Argo CD](./gitops-lab.md).

### Theo dõi quá trình promotion từ commit của lập trình viên tới production

Giả sử production và staging đang chạy `v1.4.2`, và CI đang đưa vào `v1.5.0`.

1. Review một thay đổi trong repository mã nguồn. Chạy lint, unit test và các bước kiểm tra bảo mật, tích hợp bắt buộc.
2. Sau khi merge, CI build và xuất bản image. Ghi nhận cùng nhau source commit, artifact digest và bằng chứng kiểm thử để người phê duyệt có thể xác nhận chính xác thứ gì đã được kiểm thử.
3. CI hoặc hệ thống tự động hóa phát hành mở một GitOps PR chỉ thay đổi digest trong `environments/dev/payment-values.yaml`. Sau khi merge, Argo CD refresh, repo server render Helm và cơ chế auto-sync phù hợp sẽ cập nhật môi trường development.
4. Sau khi smoke test trên development đạt, một staging PR sao chép **đúng digest đó** sang `environments/staging/payment-values.yaml`. Chạy kiểm thử end-to-end, contract test, kiểm tra tương thích migration và kiểm thử hiệu năng hoặc smoke test nếu phù hợp. Hệ thống kiểm thử phải thực thi các bài kiểm tra này và gắn kết quả với candidate digest.
5. Một production PR sao chép digest đó sang `environments/prod/payment-values.yaml`. Một quy tắc phê duyệt mẫu có thể yêu cầu hai reviewer, mọi kiểm tra đều đạt, mức lỗ hổng bảo mật trong ngưỡng chấp nhận và nằm trong khung giờ phát hành (release window). Việc merge PR cấp phép cho cấu hình production. Thao tác sync thủ công hoặc Sync Window sẽ kiểm soát thời điểm áp dụng.
6. Kiểm tra revision của Application, các điều kiện `Synced` và `Healthy`, image đang chạy của Deployment và các metric ứng dụng hoặc synthetic check. Một rollout có thể báo healthy trong khi lỗi thanh toán, độ trễ hoặc lỗi nghiệp vụ lại tăng lên.

Mỗi bước promotion thay đổi cấu hình mong muốn của môi trường đích. Controller của nó sẽ tạo mới hoặc cập nhật các đối tượng trong cluster đó từ khai báo mới. Xem [trình mô phỏng promotion](./gitops-exercises.mdx#promote-a-release-through-environments) để thực hành các cổng kiểm thử staging và phê duyệt production.

Ví dụ, staging PR có thể chỉ gồm một thay đổi trên duy nhất một file như sau. Production PR sẽ áp dụng cùng digest mới đó vào file values của production sau khi staging đạt yêu cầu. Các digest này chỉ là giá trị minh họa.

```diff
--- a/environments/staging/payment-values.yaml
+++ b/environments/staging/payment-values.yaml
@@ -1,3 +1,3 @@
 image:
   repository: registry.example.com/payments/payment-service
-  digest: sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
+  digest: sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

So sánh các source revision đã phân giải của Application, manifest mong muốn và image đang chạy sau khi sync production. Thay context bằng kubeconfig context của production cluster đã đăng ký. Với Multiple Sources, ghi nhận revision cho cả chart và values.

```bash
argocd app get payment-prod --refresh
argocd app manifests payment-prod
kubectl --context gke-prod -n payments get deployment payment-service \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="payment")].image}{"\n"}'
kubectl --context gke-prod -n payments rollout status deployment/payment-service
```

Sử dụng kết quả sync của Application và bằng chứng kiểm thử để phân biệt giữa một thay đổi Git đã được phê duyệt, một đợt rollout đã hoàn tất và một bản phát hành thành công. Ghi lại digest trước đó để PR rollback có thể khôi phục nó mà không phải đoán từ một tag có thể thay đổi.

## Chọn nhánh (branch) hay thư mục (path) để cô lập môi trường

| Thiết kế | Cách hoạt động | Lợi ích và đánh đổi |
| --- | --- | --- |
| Mỗi môi trường một nhánh (Branch per environment) | Các Application theo dõi các nhánh như `dev`, `staging` và `prod`. Một Application có thể dùng `targetRevision: prod`. | Lịch sử nhánh và nhịp độ phát hành độc lập. Các thao tác merge và cherry-pick có thể gây phân kỳ (divergence) hoặc kéo theo thay đổi không liên quan. Cần so sánh manifest đã phân giải khi promote. |
| Mỗi môi trường một thư mục (Folder per environment) | Tất cả Application có thể cùng theo dõi `main` và đọc các đường dẫn hoặc file values khác nhau, chẳng hạn `environments/prod/payment`. | Review PR theo phạm vi đường dẫn giúp dễ kiểm tra các bước promote. Tuy nhiên, chỉnh sửa trên chart, base hoặc ApplicationSet dùng chung vẫn có thể ảnh hưởng nhiều môi trường. Cần bảo vệ các nguồn dùng chung tương ứng. |

Một nhánh `main` được bảo vệ hoàn toàn có thể phục vụ production nếu quy trình PR và phê duyệt từ chủ sở hữu bao phủ mọi đầu vào làm thay đổi kết quả render production, artifact được pin chặt chẽ và các danh tính giới hạn quyền kiểm soát thao tác sync. Một thay đổi chỉ giới hạn trong dev values có thể đẩy Git revision tiến lên mà không làm thay đổi các đối tượng được render cho production. Hãy pin một commit hoặc một tham chiếu phát hành bất biến khi yêu cầu phê duyệt áp dụng cho duy nhất một tập manifest chính xác; khi đó, bước promotion bao gồm việc cập nhật tham chiếu được theo dõi trong cấu hình cha. Áp dụng linh hoạt cả hai cách tiếp cận tùy theo mức độ kiểm soát phát hành bạn cần.

## Khôi phục sau một bản phát hành production

| Phương pháp khôi phục | Khi nào nên dùng | Những gì cần xác minh |
| --- | --- | --- |
| Git revert | Commit promotion nằm tách biệt. Revert nó trên một nhánh, review bản diff production kết quả và merge theo quy trình phát hành thông thường. | Argo CD render lại digest trước đó tại revision revert mới, sync áp dụng nó và các tín hiệu sau triển khai phục hồi. |
| Thay đổi Git có mục tiêu (Targeted Git change) | Thay đổi gốc có chứa công việc không liên quan. Gửi một PR chỉ khôi phục lại digest hoặc cấu hình trước đó. | Commit mới giữ lại các thay đổi độc lập trong khi khôi phục image đã phê duyệt và cấu hình tương thích. |
| Rollback lịch sử Argo CD | Một tình huống khôi phục vận hành có kiểm soát cần quay về một revision đã triển khai trước đó. Rà soát auto-sync và, với các Application sinh tự động, thay đổi nó thông qua ApplicationSet policy dự kiến trước khi dùng history rollback. | Argo CD không hỗ trợ history rollback khi automated sync đang bật. Phải khôi phục trạng thái mong muốn trong Git trước khi bật lại sync bình thường để phiên bản lỗi không quay trở lại. |

Đối với một commit promotion tách biệt, thao tác Git trên một nhánh review là `git revert <promotion-commit-sha>`. Xác nhận digest trước đó vẫn còn trong registry và mã nguồn của nó dùng được với schema cơ sở dữ liệu hiện tại. Khôi phục dữ liệu và rollback schema đòi hỏi một kế hoạch riêng. [Argo CD automated sync and rollback](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/#automated-sync-semantics)

## Bảo vệ quá trình phân phối lên production

| Rủi ro | Biện pháp kiểm soát |
| --- | --- |
| Cấu hình production chưa qua review | Bảo vệ nhánh, yêu cầu chủ sở hữu phê duyệt cho production và các đầu vào dùng chung, đồng thời bắt buộc các kiểm tra trên PR. |
| Sai artifact | Pin theo digest và gắn kết bằng chứng quét bảo mật, chữ ký và provenance vào chính digest đó. |
| Sai cluster, namespace hoặc kind | Giới hạn repository, đích triển khai và các loại tài nguyên được phép bằng `AppProject`. Đồng thời giới hạn quyền Kubernetes trên cluster đích. |
| Xóa nhầm tài nguyên | Rà soát độc lập các thiết lập sync prune, chính sách xóa của ApplicationSet, finalizer và chính sách lưu giữ (retention). |
| Lưu secret trong Git | Dùng secret manager kết hợp External Secrets hoặc một quy trình mã hóa đã phê duyệt. Base64 không mã hóa giá trị secret. |
| Xung đột giữa các controller | Định nghĩa rõ quyền sở hữu tài nguyên và trường dữ liệu. Sử dụng các quy tắc diff giới hạn phạm vi hẹp và hành vi sync phù hợp khi cần. |
| Thay đổi ngoài khung giờ phát hành | Sử dụng AppProject Sync Windows để kiểm soát thời điểm. Review các ngoại lệ sync thủ công tách biệt với bước phê duyệt PR. |
| CI có quyền quá mức | Giới hạn thông tin xác thực xuất bản và mở PR đúng theo vai trò, và giữ quyền truy cập production cluster trong delivery controller. |

Argo CD Image Updater có thể phát hiện các ứng viên mới trên registry và ghi tham chiếu của chúng thông qua Git hoặc cập nhật tham số Application. Cơ chế ghi ngược vào Git (Git write-back) giúp lưu lại vết lịch sử trong repository. Nếu dùng công cụ này cho các môi trường được bảo vệ, hãy định tuyến thay đổi qua quy trình review thay vì cấp cho updater quyền bỏ qua kiểm duyệt trực tiếp vào nguồn production. Kiểm tra phiên bản bạn cài đặt hỗ trợ những tính năng write-back và mở PR nào. [AppProjects](https://argo-cd.readthedocs.io/en/stable/user-guide/projects/) · [Sync Windows](https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/) · [Image Updater write-back](https://argocd-image-updater.readthedocs.io/en/stable/basics/update-methods/)

## Xác minh quy trình trong bài lab

Sử dụng [bài thực hành GitOps với Argo CD](./gitops-lab.md) để thiết lập cluster và [danh sách kiểm tra phát hành](./gitops-exercises.mdx#track-the-production-gitops-lab) để theo dõi tám tác vụ từ repository mã nguồn cho đến rollback.

- **CI xuất bản một image mới và Git không thay đổi.** Một Deployment được pin vào digest hiện có vẫn tiếp tục khai báo cùng artifact đó trừ khi có một cơ chế tự động hóa khác thay đổi cấu hình của nó.
- **Production theo dõi `main` và một commit chỉ sửa dev values.** Production có thể quan sát thấy một source revision mới. Nếu kết quả render cho production giống hệt trước đó, bản thân việc thay đổi revision sẽ không làm thay đổi workload.
- **Production cần quay từ digest A về digest B.** Đưa B vào cấu hình triển khai có thẩm quyền. Quan sát quá trình đồng bộ và xác minh độc lập cả image lẫn các metric dịch vụ.

Tiếp tục với [Workload Identity và External Secrets](../02-controllers-platform/lesson-06-workload-identity-secrets.md), [Admission và Policy](../02-controllers-platform/lesson-07-admission.md) và [Bảo mật](../08-security-governance/lesson-18-security.md) để tìm hiểu lớp kiểm soát tiếp theo cho môi trường production.
