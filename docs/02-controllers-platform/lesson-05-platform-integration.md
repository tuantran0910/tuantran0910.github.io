---
title: "Lesson 05 — Config Connector, Config Sync & Cloud Resource Reconciliation"
sidebar_label: "Lesson 05: Config Connector, Config Sync & Cloud Resource Reconciliation"
sidebar_position: 5
description: "Google Cloud infrastructure CRDs, Config Sync, controller ownership"
tags: [kubernetes, platform-engineering]
last_reviewed: 2026-11-22
source_fidelity: editorial-reconstruction
---

:::info Source status
The content was **reconstructed from the sequence of topics and the source material that could still be retrieved**. The exact original title and full text have not been verified, so this is not presented as a verbatim quotation.
:::

# Lesson 05: Config Connector, Config Sync & Cloud Resource Reconciliation

## Learning objectives

Master **Google Cloud infrastructure CRDs, Config Sync, and controller ownership**, understand controller responsibilities and ownership boundaries, and apply these concepts in a lab on a test cluster.


## 1. The platform's distinct control planes

A production GKE platform may use **Terraform**, **Config Connector**, **Config Sync**, and **Argo CD**. They are not interchangeable: each tool controls a different kind of desired state and has its own lifecycle. The summary from the conversation history confirms that the series discussed Config Connector (CNRM) and Config Sync; the exact title of this lesson has not been verified against the full original text.

```mermaid
flowchart TD
  Git[Git repositories] --> TF[Terraform pipeline]
  Git --> CS[Config Sync]
  Git --> Argo[Argo CD]
  CS --> K8s[Kubernetes API]
  Argo --> K8s
  K8s --> CNRM[Config Connector Controller]
  CNRM --> GCP[Google Cloud APIs]
  TF --> GCP
```

### Dividing ownership

| Resource | Preferred owner |
|---|---|
| VPC/GKE baseline | Terraform or another designated infrastructure owner |
| Shared Kubernetes guardrails | Config Sync or Argo CD; **do not have both** manage the same fields |
| Application manifests | Argo CD |
| Cloud resource represented by a CRD | Config Connector, if designated as the owner |

## 2. What is Config Connector?

Config Connector (CNRM) runs controllers that manage Google Cloud resources through Kubernetes custom resources. For example, a `StorageBucket` CR can create a Cloud Storage bucket:

```yaml
apiVersion: storage.cnrm.cloud.google.com/v1beta1
kind: StorageBucket
metadata:
  name: unique-bucket-name-replace-me
  namespace: config-control
  annotations:
    cnrm.cloud.google.com/project-id: PROJECT_ID
spec:
  location: ASIA-SOUTHEAST1
  storageClass: STANDARD
  uniformBucketLevelAccess: true
```

Check this example against your Config Connector version and schema and your actual namespace mode configuration. The bucket name must be globally unique, and the controller's IAM permissions must allow it to create the bucket.

## 3. Reconciliation and external consistency

```text
Kubernetes StorageBucket spec
  ↓
CNRM controller
  ↓
Google Cloud Storage API
  ↓
External bucket state
  ↓
CR status and conditions
```

If the cloud API quota is exhausted or IAM permissions are missing, Kubernetes can still successfully store the object while the controller repeatedly reports reconciliation errors. Distinguish **API acceptance** from **external resource readiness**.

### Follow a StorageBucket from API admission to cloud readiness

The CRD exposes a namespaced `StorageBucket` API under `storage.cnrm.cloud.google.com`. A request to create a CR passes authentication, authorization, admission and schema validation. Kubernetes persists the accepted object in etcd. At this point `spec.storageClass: STANDARD` is stored desired state. The bucket may still be absent from Google Cloud.

A controller typically lists existing objects, then watches changes using the returned `resourceVersion`. The watch sends `ADDED`, `MODIFIED`, and `DELETED` events. A client that receives `410 Gone` for a stale watch position can relist and start a fresh watch. A typical Go controller keeps an informer cache and queues resource keys such as `config-control/unique-bucket-name-replace-me`. A worker reads the current object when it processes the key, so it can converge on the latest spec even when several updates are coalesced. This describes the standard controller pattern. Config Connector's documented parent controller dispatches requests to resource-specific implementations, which include direct and Terraform-based controllers. It uses Kubernetes APIs to read and update CRs and cloud APIs to manage real resources. [Kubernetes API concepts](https://kubernetes.io/docs/reference/using-api/api-concepts/) · [Config Connector controller types](https://docs.cloud.google.com/config-connector/docs/concepts/controller-types)

### Why a cloud-side edit can be repaired without a Kubernetes event

| Step | Kubernetes CR | Google Cloud bucket |
| --- | --- | --- |
| Initial successful reconciliation | `STANDARD` | `STANDARD` |
| Operator changes storage class in Cloud Console | `STANDARD` | `NEARLINE` |
| Scheduled reconcile reads cloud state | `STANDARD` | `NEARLINE` detected |
| Controller applies the supported update | `STANDARD` | `STANDARD` |

The Console edit changes the cloud resource independently of the CR. A periodic reconcile still reads actual state and compares fields declared in the CR. A delayed requeue illustrates how a controller can schedule another pass without a fresh watch event. A restart can rebuild the work from persisted CRs. A temporary cloud API failure can delay convergence and produce retries, condition changes and events.

Google Cloud documents a resource-specific average interval with jitter. The StorageBucket reference lists a 600-second default average. Where appropriate, set `cnrm.cloud.google.com/reconcile-interval-in-seconds: "60"` under the CR's annotations to request a shorter average. Short intervals increase cloud API calls. Setting the value to `"0"` stops periodic reconciliation after the object is up to date. Google documents that editing the value back to nonzero alone does not restore it. Follow the documented recovery procedure if needed. This behavior is independent of Argo CD polling and self-heal. [Reconciliation strategy](https://docs.cloud.google.com/config-connector/docs/concepts/reconciliation) · [StorageBucket reference](https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/storage/storagebucket)

### Troubleshoot a resource that was accepted but is still pending

```bash
kubectl get crd storagebuckets.storage.cnrm.cloud.google.com
kubectl -n config-control get storagebucket unique-bucket-name-replace-me -o yaml
kubectl -n config-control describe storagebucket unique-bucket-name-replace-me
kubectl -n cnrm-system get pods
kubectl -n config-control wait --for=condition=Ready \
  storagebucket/unique-bucket-name-replace-me --timeout=300s
```

Use a dedicated project and a globally unique bucket name for a provisioning lab. Verify the Config Connector identity can access that project. When a CR reports `Ready=True`, compare `status.observedGeneration` with `metadata.generation` to make sure the status describes the update you are checking. A wait for `Ready` alone can observe an older successful condition. Watch CR status with `kubectl get storagebuckets -n config-control -w` and compare it with the cloud view. Permission errors, missing references, immutable fields and write-only settings each require different remedies. A write-only value such as a password cannot be compared by reading cloud state, while an immutable location requires a resource-specific migration plan. [Config Connector troubleshooting](https://docs.cloud.google.com/config-connector/docs/troubleshooting)

For a lab rollback, revert the declared mutable value in the authoritative source, then check both status and the real resource. Review deletion behavior before removing a CR from a source with pruning enabled. The `cnrm.cloud.google.com/deletion-policy: abandon` annotation can preserve the actual resource when the CR is removed. Verify the annotation on the live CR before allowing removal. [Config Connector annotations](https://docs.cloud.google.com/config-connector/docs/reference/annotations)

### Read generation and readiness together

Suppose the bucket was provisioned at generation 1. You then change the desired storage class to `NEARLINE`. A read immediately after applying the change might return this excerpt:

```yaml
metadata:
  name: unique-bucket-name-replace-me
  namespace: config-control
  generation: 2
spec:
  storageClass: NEARLINE
status:
  observedGeneration: 1
  conditions:
    - type: Ready
      status: "True"
      reason: UpToDate
```

The API server has accepted generation 2. The controller's status still describes generation 1, so this `Ready=True` cannot confirm the new storage class. In a successful update, look for both `status.observedGeneration: 2` and `Ready=True`, then confirm the real bucket through Cloud Storage. If the generation matches but `Ready` is false, read its reason, message and recent events. A condition can also become stale after an external change until the next cloud-side check.

```bash
kubectl -n config-control get storagebucket unique-bucket-name-replace-me -o jsonpath='{.metadata.generation}{" desired / "}{.status.observedGeneration}{" observed\n"}{range .status.conditions[?(@.type=="Ready")]}{.status}{" "}{.reason}{": "}{.message}{"\n"}{end}'
```

### Model a delayed requeue

This pseudocode illustrates how a worker can schedule another check even when Kubernetes sends no new event. Config Connector's implementation and retry behavior vary by controller and resource.

```text
reconcile(key):
    object = read current Kubernetes object by key
    if object no longer exists:
        finish

    actual = read the corresponding Cloud Storage bucket
    if the cloud read fails with a retryable error:
        record the failure when possible
        retry using backoff

    if bucket is absent:
        request creation using object.spec
    else if a managed, mutable field differs:
        request an update using object.spec

    record observed generation and reconciliation result
    schedule this key again after the configured delay with jitter
```

After a Console edit to the bucket, its CR can still have the same `generation` and `resourceVersion` it had before the edit. The delayed check reads the cloud field directly, discovers the mismatch and attempts repair. In a sandbox, record the declared value, the out-of-band value, the next reconciliation result and the final cloud value. If the actual field still differs, check IAM permissions, whether the field was declared and is writable, and whether periodic reconciliation is enabled. [Reconciliation strategy](https://docs.cloud.google.com/config-connector/docs/concepts/reconciliation) · [StorageBucket status](https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/storage/storagebucket)

## 4. Config Sync vs. Argo CD

Config Sync applies configuration from Git to Kubernetes clusters. Argo CD typically provides an application delivery model and application-level health and sync semantics. The two tools can coexist, but ownership must be clear for CRDs, namespaces, NetworkPolicies, policies, and workloads.

For example, a Config Sync Git repository can hold namespace-wide security policies while Argo CD manages only application Deployments. If both apply the same `NetworkPolicy`, their reconciliation loops can fight each other and cause drift.

For fleet membership, namespace delegation, and controller selection, see [Argo CD, Config Sync, and GKE Fleet Management](./fleet-config-sync.md).

## 5. Resource deletion and ownership boundaries

Deleting a cloud resource CR is not always harmless. Depending on the deletion policy, the controller may delete the backing resource in Google Cloud. Conversely, if Terraform manages that resource too, drift correction can cause the two systems to conflict. Before transferring ownership, prepare a migration plan, understand the import and abandon semantics, and check the audit logs.

## 6. GitOps bootstrap dependency chain

1. Use Terraform to create the IAM configuration, network, and cluster.
2. Bootstrap the required operators and controllers.
3. Provision workload identities for the controllers.
4. Apply platform policies in dependency order.
5. Deploy applications with Argo CD or Config Sync according to the ownership split.
6. Check both the `Ready` conditions and the external cloud resources.

## 7. Lab

Create a test StorageBucket in a sandbox project. Observe the CR conditions, simulate missing permissions with a separate service identity without changing production permissions, and then clean up according to the deletion policy you verified. In an isolated environment, try having Config Sync and Argo CD manage the same namespace label and observe the resulting warnings or diffs.

**Documentation:** [Config Connector](https://cloud.google.com/config-connector/docs/overview) · [Config Sync](https://cloud.google.com/kubernetes-engine/enterprise/config-sync/docs/overview) · [Argo CD](https://argo-cd.readthedocs.io/).

## Deep dive: the ownership contract between Terraform, Config Connector, and GitOps

**Editorial status:** Config Connector and Config Sync are relevant to the learning path, but *the full original text is not available to confirm that this was the original Lesson 05*. This section was written as a new deep dive and may move once it can be checked against the transcript.

### What happens when two systems declare the same resource?

Suppose Terraform manages the Cloud Storage bucket `payment-audit` while Config Connector manages the same bucket through a `StorageBucket` CR. If Terraform expects `uniform_bucket_level_access=true` but the CR declares a different state, both control loops will try to write their own desired state. Kubernetes has no built-in way to discover Terraform state. This can cause persistent drift, unintended policy changes, or one controller deleting a resource still in use by the other system.

Identify the **system of record** for each resource, not just for each repository:

```text
Cloud VPC / Shared VPC / IAM baseline     → Terraform owner
Argo CD Application, workloads            → Argo CD owner
Kubernetes platform policies              → Config Sync or Argo CD; choose one
CNRM-managed StorageBucket resource       → Config Connector owner
Application-produced status, endpoints    → Kubernetes controllers owner
```

### How Config Connector works: desired vs. actual state

A `StorageBucket` custom resource is stored in Kubernetes etcd, but the backing bucket lives in Google Cloud. A successful Kubernetes API write only confirms that the API accepted the spec. The controller still has to call the Google Cloud API, where it can encounter permission denials, quota limits, eventual consistency, or external validation errors. It then reports the outcome through conditions and events.

Typical troubleshooting commands:

```bash
kubectl api-resources | grep -i storagebucket
kubectl get storagebuckets.storage.cnrm.cloud.google.com -A
kubectl describe storagebucket BUCKET_CR -n NAMESPACE
kubectl get events -n NAMESPACE --sort-by=.lastTimestamp
```

Check the controller logs according to the deployment mode and Config Connector version. Before deleting the CR, check the **deletion policy**, whether the backing bucket contains data, and who ultimately owns the resource.

### Config Sync and Argo CD are separate reconciliation engines

Both can update the Kubernetes API, but their interfaces and governance models often differ. One way to divide responsibilities is:

- Config Sync: `Namespace`, `NetworkPolicy`, admission policy, quota, baseline RBAC.
- Argo CD: application `Deployment`, `Service`, `HPA`, `Rollout`.
- Config Connector: cloud resources declared by the platform team, with appropriate IAM permissions.

If you use both Config Sync and Argo CD, avoid managing the same resources and make sure two sources do not control **the same field**. Conflicts are particularly risky for namespace labels used as policy selectors and ServiceAccount annotations used for Workload Identity.

### A bootstrap workflow without circular dependencies

```mermaid
flowchart TD
  A[Terraform: project/VPC/IAM/GKE] --> B[Bootstrap Kubernetes access]
  B --> C[Install core CRDs and controllers]
  C --> D[Provision controller identity]
  D --> E[Apply platform policies]
  E --> F[Argo CD workloads]
  F --> G[Observability and readiness]
```

If another resource must bootstrap `ConfigConnectorContext` or `ConfigConnector`, document that prerequisite explicitly so a controller does not depend on itself for installation.

### Safe lab

1. Use a Google Cloud sandbox project with a low budget and quota, and choose a globally unique bucket name.
2. Create a StorageBucket CR or equivalent by following the documentation for your version.
3. Observe the `Ready` and `Reconciling` conditions and check the backing bucket in Google Cloud.
4. Revoke one IAM permission from the **lab identity** to observe the reconciliation error, then restore it.
5. Clean up only after checking the deletion policy and the data in the bucket.

Sources: [Config Connector Overview](https://cloud.google.com/config-connector/docs/overview), [Config Sync overview](https://cloud.google.com/kubernetes-engine/enterprise/config-sync/docs/overview), [Argo CD projects](https://argo-cd.readthedocs.io/en/stable/user-guide/projects/).

## Summary and related concepts

- Separate desired state from observed state and identify the owner of each field or resource.
- Do not assume a successful API operation means the external system is ready to serve requests.
- Verify IAM and RBAC, readiness, the data lifecycle, and recovery procedures before using this setup in production.

[Back to the Learning Path](../learning-path.md)
