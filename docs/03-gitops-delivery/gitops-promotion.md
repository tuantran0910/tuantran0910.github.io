---
title: "GitOps Repository Design and Environment Promotion"
sidebar_position: 22
tags: [gitops, argocd, helm, kustomize]
---

## Separate application builds from deployment decisions

A platform with 30 microservices can build images many times a day while releasing to production deliberately. Development can track the latest approved development change. Staging verifies the exact candidate that production may receive. Production configuration changes only when release evidence and approval justify promoting that candidate.

Application desired state includes the image, replica count, and runtime configuration. Platform desired state includes namespaces, shared policy, infrastructure declarations, and cluster services. Each has its own owners and approval path. Publishing a new image records a candidate in the registry. The deployment configuration determines which environments are allowed to run it.

| Actor | Responsibility | Evidence or output |
| --- | --- | --- |
| Developer | Review and merge application changes | Source commit and code review |
| CI | Test, build, scan, and publish an OCI image | Digest, test results, vulnerability report, and optionally SBOM, signing and provenance |
| Container registry | Store and serve published content | Image tag and content digest |
| Environment owners | Approve desired deployment changes | A GitOps commit identifying the artifact and environment |
| Argo CD | Render, compare, sync, and detect drift | Observed revision, sync status, and operation result |
| Kubernetes controllers | Realize the submitted workload spec | Rollout and runtime status |

CI can publish the image and open a PR in the GitOps repository without production Kubernetes credentials. Argo CD uses its own scoped identity to deploy approved state. A developer's permission to merge source changes can therefore be independent of production release approval. [Argo CD best practices](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/#separating-config-vs-source-code-repositories)

```text
payment-service/                  platform-gitops/
├── src/                          ├── charts/
├── tests/                        ├── environments/
├── Dockerfile                    ├── argocd/applicationsets/
├── go.mod                        ├── argocd/projects/
└── .github/workflows/ci.yaml      └── policies/
```

A source commit such as `feat: support partial refunds` starts tests and a build. A configuration commit such as `chore(prod): promote payment to v1.5.0` authorizes a change to production desired state. Keeping those histories separate also lets you change a replica count or policy without rebuilding an application image.

### Choose the boundaries of the configuration repository

Separating source code from configuration is one decision. Choosing one or many **configuration** repositories is another.

| Layout | Strengths | Tradeoffs |
| --- | --- | --- |
| One configuration monorepo for apps and platform | Shared chart and overlay conventions, common discovery, and coordinated changes in one PR | More teams share a review and access boundary. Changes to shared inputs can affect many Applications. |
| Configuration repositories per team, domain, or platform boundary | Teams can operate with distinct access, ownership, release cadence, and Git credentials | Cross-repository changes need coordination and explicit compatibility checks. |

For a small platform, one configuration repository separated from service source repositories can simplify onboarding. Split configuration when a team or platform domain needs a separate trust boundary. Path-based review and `CODEOWNERS` can require owner approval in a shared repository. Use distinct repositories when read or write access itself needs stronger isolation.

The application repository owns source code, tests, and image builds. A deployment repository can own environment-specific manifests and the immutable image references consumed by Argo CD. A monorepo can use the same separation through directory ownership and review rules. Separate repositories help when production has different approval or read-access requirements. A monorepo simplifies coordinated changes across charts, overlays and application source. In either case, identify the authoritative source for each object and review access to configuration that can create cluster-scoped resources.

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

For a chart stored in Git, one simple layout places `values-dev.yaml`, `values-staging.yaml`, and `values-prod.yaml` beside the chart. Point each Application at the chart path and select one values file. If values live in a separate repository, use Argo CD's multiple-source values support and explicitly configure the values source and its revision. For Kustomize, point each Application at `overlays/dev`, `overlays/staging`, or `overlays/prod` and keep shared manifests in `base`. An AppProject can constrain allowed sources and destinations. [Argo CD Helm values](https://argo-cd.readthedocs.io/en/stable/user-guide/helm/) · [Multiple sources](https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/)

## Select Helm values for each environment

A shared chart describes which Kubernetes objects are rendered. Environment values supply differences such as replicas and logging. An Application or [ApplicationSet](../02-controllers-platform/lesson-04-controller-foundations.md) chooses where the output goes. The chart must consume the values you define, including any log level configuration.

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

These tag-based files make the environment difference visible. Use the digest-based form below for the promotion workflow and update the chart to render the digest-based image reference.

### Load chart and values with Argo CD Multiple Sources

This Application reads a Git-hosted chart and a values file from the root of a referenced Git source. The repository and destination are illustrative. Register `gke-prod`, allow both source repositories and the destination in the `payments` AppProject, and grant the target identity the permissions it needs.

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

The first source renders the chart. The second maps `$values` to the repository root. The reference goes at the beginning of the values path. Because the second source has no `path`, it supplies values without generating additional resources. The two sources point to the same repository in this example. If they move to separate repositories, the values contract and access to both repositories still need to be maintained. For an external Helm chart, select the chart and a release version using the appropriate Helm or OCI source syntax. [Argo CD Multiple Sources](https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/#helm-value-files-from-external-git-repository)

An image digest pins the workload artifact. It does not pin the chart, values source, or a remote Kustomize base. To reproduce an approved release, record the resolved revision of each source and pin inputs that must stay immutable. To preview the same chart locally, use `helm template payment-prod ./charts/payment-service -f ./environments/prod/payment-values.yaml`. For a Kustomize layout, build the specific environment overlay and review its full output. [Argo CD immutable manifests guidance](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/#ensuring-manifests-at-git-revisions-are-truly-immutable)

## Promote the same image digest

CI builds and publishes an image once. Capture the digest returned by the registry, then use that immutable digest in all three environments. The digest below is an illustrative placeholder.

```yaml
image:
  repository: registry.example.com/payments/payment-service
  digest: sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

Make the chart support that value. A digest-pinned reference renders as `repository@sha256:...`:

```text
image: "{{ .Values.image.repository }}@{{ .Values.image.digest }}"
```

With the Kustomize variant, substitute the digest in the environment overlay:

```yaml
images:
  - name: registry.example.com/payments/payment-service
    digest: sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

The image name in the overlay must match the base container image. Render the target environment and check the complete image reference before merging. Development and production can have different replicas, resources and policies while using the same service artifact.

| Stage | Repository change | Evidence to collect |
| --- | --- | --- |
| Dev | Update the dev digest to the artifact produced by CI | Rendered image reference, sync status, smoke-test results |
| Staging | Copy the approved dev digest into the staging configuration | Same digest, healthy rollout, integration results |
| Production | Promote the staging digest in a reviewed production PR | Reviewed render or diff, successful sync, rollout and service signals |

### Follow artifact identity independently from Git revision

| Identifier | What it says |
| --- | --- |
| `payment:latest` | A tag that can move when the registry permits reassignment. |
| `payment:v1.5.0` | A version label. Its immutability depends on registry policy. |
| `payment@sha256:…` | A content-addressed image reference. A full SHA-256 digest has 64 hexadecimal characters after the prefix. |
| `targetRevision` | The Git revision, branch, or Helm chart version from which Argo CD resolves configuration. |

If dev, staging, and production rebuild the same tag, they can produce different digests because dependencies, build environments, or generated files differ. Tests against the dev image then provide evidence for the dev digest. Build once and promote the same digest. Environment configuration can still differ, including replicas, feature flags, and external endpoints. Preserve the tag as display metadata if useful and ensure registry retention keeps previously deployed digests available for rollback. [Kubernetes images](https://kubernetes.io/docs/concepts/containers/images/#image-names)

## Follow one promotion and one rollback

1. A payments-team PR updates only the dev digest. After merge, Argo CD renders the dev manifests and the dev Application syncs according to policy.
2. Once smoke tests pass, a staging PR copies the exact digest that passed dev. Verify the staging Application tracks the expected branch and that the Deployment spec contains that digest.
3. The production PR updates the production digest after staging passes. Review both the image and the full manifest diff. If you require an approval before apply, combine repository approval with a manual sync or an appropriate sync policy.
4. If production needs a rollback, revert the production promotion commit and merge the revert. Confirm Argo CD sees the reverted Git revision, renders the previous digest and applies it. Check rollout health and application metrics separately. For a commit that mixed unrelated changes, submit a targeted PR restoring just the previous digest.
5. Record the promoted digest, source revision, and result. Database migrations and data recovery have separate rollback plans. Confirm that the previous image remains compatible with the current schema before promotion.

A new Git revision may render the same manifest for an unaffected environment. Check the manifest diff and workload rollout separately from the source revision. Where progressive delivery is configured, the evidence can include analysis results and canary metrics from [Progressive Delivery](./lesson-10-progressive-delivery.md). Exercise this workflow with the [hands-on GitOps lab](./gitops-lab.md).

### Trace the promotion from developer commit to production

Suppose production and staging are running `v1.4.2`, and CI is introducing `v1.5.0`.

1. Review a change in the source repository. Run lint, unit tests, and the required security and integration checks.
2. After merge, CI builds and publishes the image. Record the source commit, artifact digest, and verification evidence together so an approver can confirm exactly what was tested.
3. CI or release automation opens a GitOps PR changing only the digest in `environments/dev/payment-values.yaml`. After merge, Argo CD refreshes, the repo server renders Helm, and an eligible auto-sync updates development.
4. After development smoke tests pass, a staging PR copies the **same digest** to `environments/staging/payment-values.yaml`. Run end-to-end and contract tests, migration compatibility checks, and performance or smoke tests as appropriate. The test system must run these checks and associate the results with the candidate digest.
5. A production PR copies that digest to `environments/prod/payment-values.yaml`. An example approval rule requires two reviewers, successful checks, acceptable vulnerability findings, and a release window. Merging the PR authorizes the production configuration. A manual sync or Sync Window can govern when it is applied.
6. Check the Application's revision, `Synced` and `Healthy` conditions, the Deployment's live image, and application metrics or synthetic checks. A rollout can be healthy while payment errors, latency, or business failures increase.

Each promotion changes the destination's desired configuration. Its controller creates or updates objects in that cluster from the new declaration. See the [promotion simulator](./gitops-exercises.mdx#promote-a-release-through-environments) to exercise the staging test and production approval gates.

For example, the staging PR can contain this one-file change. The production PR applies the same new digest to the production values once staging has passed. These digests are placeholders.

```diff
--- a/environments/staging/payment-values.yaml
+++ b/environments/staging/payment-values.yaml
@@ -1,3 +1,3 @@
 image:
   repository: registry.example.com/payments/payment-service
-  digest: sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
+  digest: sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

Compare the resolved Application source revisions, desired manifests, and live image after production sync. Replace the context with the registered production cluster's kubeconfig context. With Multiple Sources, record the revisions for both the chart and the values.

```bash
argocd app get payment-prod --refresh
argocd app manifests payment-prod
kubectl --context gke-prod -n payments get deployment payment-service \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="payment")].image}{"\n"}'
kubectl --context gke-prod -n payments rollout status deployment/payment-service
```

Use the Application's sync result and test evidence to distinguish an approved Git change, a completed rollout, and a successful release. Record the previous digest so the rollback PR can restore it without guessing from a mutable tag.

## Choose branches or paths for environment isolation

| Design | How it works | Benefits and tradeoffs |
| --- | --- | --- |
| Branch per environment | Applications track branches such as `dev`, `staging`, and `prod`. An Application can use `targetRevision: prod`. | Independent branch histories and release cadence. Merges and cherry-picks can introduce divergence or unrelated changes. Compare resolved manifests during promotion. |
| Folder per environment | Applications may all track `main` and consume different paths or values files, such as `environments/prod/payment`. | Path-scoped PR reviews make promotions easy to inspect. Edits to a shared chart, base, or ApplicationSet can still affect multiple environments. Protect shared sources accordingly. |

A protected `main` can serve production if PR and owner approval cover every input that changes production rendering, the artifact is pinned, and restricted identities control sync. A change limited to dev values may advance a Git revision without changing production's rendered objects. Pin a commit or immutable release reference where approval applies to one exact set of manifests. Promotion then includes changing the tracked reference in the parent configuration. Apply both approaches according to the release controls you need.

## Recover from a production release

| Recovery method | When to use it | What to verify |
| --- | --- | --- |
| Git revert | The promotion commit is isolated. Revert it on a branch, review the resulting production diff, and merge through the normal release process. | Argo CD renders the previous digest at the new revert revision, sync applies it, and post-deployment signals recover. |
| Targeted Git change | The original change contained unrelated work. Submit a PR restoring the previous digest or configuration only. | The new commit keeps independent changes while restoring the approved image and compatible config. |
| Argo CD history rollback | A controlled operational recovery needs an earlier deployed revision. Review auto-sync and, for generated Applications, change it through the intended ApplicationSet policy before using history rollback. | Argo CD does not support history rollback while automated sync is enabled. Restore Git's desired state before resuming normal sync so the unwanted version does not return. |

For an isolated promotion, the Git operation on a review branch is `git revert <promotion-commit-sha>`. Confirm the previous digest still exists in the registry and that its code can use the current database schema. Data recovery and schema rollback require a separate plan. [Argo CD automated sync and rollback](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/#automated-sync-semantics)

## Protect production delivery

| Risk | Control |
| --- | --- |
| Unreviewed production config | Protect branches, require owner approval for production and shared inputs, and enforce PR checks. |
| Wrong artifact | Pin the digest and tie scan, signature, and provenance evidence to it. |
| Wrong cluster, namespace, or kind | Restrict repositories, destinations, and permitted resource kinds with an AppProject. Limit destination Kubernetes permissions as well. |
| Accidental deletion | Review sync prune, ApplicationSet deletion policies, finalizers, and retention independently. |
| Secrets in Git | Use a secret manager and External Secrets or an approved encryption workflow. Base64 does not encrypt secret values. |
| Competing controllers | Define resource and field ownership. Use narrowly scoped diff rules and sync behavior where necessary. |
| Change outside a release window | Use AppProject Sync Windows for timing. Review manual-sync exceptions separately from PR approval. |
| Excessive CI privilege | Limit publishing and PR credentials to their role and keep production cluster access in the delivery controller. |

Argo CD Image Updater can discover registry candidates and write their references through Git or update Application parameters. Git write-back keeps a record in the repository. If using it for protected environments, route changes through review instead of giving the updater a direct bypass to a production source. Check which write-back and PR features your installed version supports. [AppProjects](https://argo-cd.readthedocs.io/en/stable/user-guide/projects/) · [Sync Windows](https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/) · [Image Updater write-back](https://argocd-image-updater.readthedocs.io/en/stable/basics/update-methods/)

## Verify the workflow in a lab

Use the [hands-on GitOps lab](./gitops-lab.md) as the cluster setup and the [release checklist](./gitops-exercises.mdx#track-the-production-gitops-lab) to track eight tasks from source repository to rollback.

- **CI publishes a new image and Git remains unchanged.** A Deployment pinned to its existing digest continues to declare the same artifact unless another automation changes its configuration.
- **Production tracks `main` and a commit changes only dev values.** Production may observe a new source revision. If the production render is identical, the revision alone does not change the workload.
- **Production must return from digest A to digest B.** Put B in the authoritative deployment configuration. Observe synchronization and verify the image and service metrics independently.

Continue with [Workload Identity and External Secrets](../02-controllers-platform/lesson-06-workload-identity-secrets.md), [Admission and Policy](../02-controllers-platform/lesson-07-admission.md), and [Security](../08-security-governance/lesson-18-security.md) for the next layer of production controls.
