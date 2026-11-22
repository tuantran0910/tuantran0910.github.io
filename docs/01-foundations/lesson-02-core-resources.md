---
title: "Lesson 02 — Kubernetes Server-Side Apply, Field Ownership & Conflict Resolution"
sidebar_label: "Lesson 02: Kubernetes Server-Side Apply, Field Ownership & Conflict Resolution"
sidebar_position: 2
description: "Server-Side Apply, managedFields, field managers, three-way merge and conflicts"
tags: [kubernetes, platform-engineering]
last_reviewed: 2026-11-22
source_fidelity: editorial-reconstruction
---

:::info Source status
The title and topic were cross-checked against the conversation history. The content below is a **detailed editorial reconstruction**, not a verbatim transcript of the entire original response.
:::

# Lesson 02: Kubernetes Server-Side Apply, Field Ownership & Conflict Resolution

## Learning objectives

Develop a solid understanding of **Server-Side Apply, managedFields, field managers, three-way merge, and conflicts**. Learn where controller responsibilities and ownership boundaries lie, and apply that knowledge in a lab on a test cluster.


## 1. What problem does Server-Side Apply solve?

Multiple actors can modify a Kubernetes object: Argo CD manages the image, an HPA manages replicas, an admission webhook adds labels, and an operator manages status. If every actor submits a complete copy of the object, one actor can overwrite another's changes. **Server-Side Apply (SSA)** uses declarative field management in the Kubernetes API server to calculate changes and detect ownership conflicts.

## 2. Client-Side Apply versus Server-Side Apply

| | Traditional Client-Side Apply (CSA) | Server-Side Apply |
|---|---|---|
| Where the merge is calculated | kubectl/client | API server |
| Main inputs | Last-applied annotation + local manifest + live object | Apply intent + managedFields/schema |
| Ownership | Does not enforce field ownership the way SSA does | Field managers own field paths |
| Conflicts | Can overwrite changes unintentionally | Can return `409 Conflict` |

CSA's three-way merge considers the original, modified, and current configurations. SSA is built on structured-merge-diff and type information from the schema.

## 3. What is `managedFields`?

```yaml
metadata:
  managedFields:
    - manager: gitops-controller
      operation: Apply
      apiVersion: apps/v1
      fieldsType: FieldsV1
      fieldsV1:
        f:spec:
          f:replicas: {}
```

This is an illustrative snippet. The actual `fieldsV1` structure is more detailed and varies with the object and its subfields. The API server uses `managedFields` metadata to track which actor owns which fields; it is **not an access control mechanism**. An actor still needs Kubernetes RBAC permission for the API operation on the resource, regardless of field ownership.

## 4. Observe an ownership conflict

Create `/tmp/payment-a.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels: {app: payment}
  template:
    metadata:
      labels: {app: payment}
    spec:
      containers:
        - name: payment
          image: nginx:1.27
```

Apply the manifest using the first manager:

```bash
kubectl apply --server-side --field-manager=platform-gitops -f /tmp/payment-a.yaml
```

Change the file to `replicas: 4`, then apply it using a different manager:

```bash
kubectl apply --server-side --field-manager=manual-operator -f /tmp/payment-a.yaml
```

If `platform-gitops` still owns `replicas` and the new value differs, the API server can return a conflict. In some cases, two managers can share ownership of a field by applying the same value. If one later tries to set a different value, the conflict rules apply.

## 5. What are the risks of forcing conflicts?

```bash
kubectl apply --server-side --field-manager=manual-operator \
  --force-conflicts -f /tmp/payment-a.yaml
```

`--force-conflicts` can take ownership of conflicting fields away from another manager. It is **not a fix for every apply error**. Especially when an HPA, Argo CD, or an operator is involved, forcing ownership can inadvertently set controllers against one another.

## 6. Assigning ownership of different fields

One strategy is to divide responsibilities:

```text
GitOps manager: image, labels, resource requests
HPA controller: replicas via /scale
Deployment controller: rollout status
Admission policy: validate security constraints
```

However, `managedFields` reflects actual API behavior and can include `Update` and `Apply` operations. Do not assume that only `Apply` affects ownership.

## 7. Omission, null, and deletion

SSA expresses the desired set of fields. When a manager stops declaring a field it owns, it can relinquish ownership. If no other actor owns the field, the API semantics can cause it to reset to its default or be removed from the object. Be careful when switching from a fully managed manifest to partial apply configurations.

## 8. Verification lab

```bash
kubectl get deployment payment -o yaml --show-managed-fields
kubectl get deployment payment -o json | jq '.metadata.managedFields[] | {manager,operation,subresource}'
kubectl explain deployment.spec.replicas
```

Run these commands against a test Deployment and record the manager before and after applying the manifest. Finish by running `kubectl delete deployment payment` in the lab namespace.

## 9. Production lessons

- Field ownership addresses some conflicts; it does not replace organizational ownership.
- Review any use of `force-conflicts`.
- When moving from client-side apply to SSA, check the migration and the transfer of field ownership.
- If Argo CD and an HPA interact, consult the official documentation for both rather than assuming that dropping `replicas` is enough in every configuration.

**References:** [Server-Side Apply](https://kubernetes.io/docs/reference/using-api/server-side-apply/) · [Declarative Config Management](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/declarative-config/) · [Argo CD Server-Side Apply](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/#server-side-apply).

## Deep dive: Server-Side Apply (SSA) semantics

**Three concepts to distinguish:** `manager` names the component claiming ownership; `operation` distinguishes `Apply` from `Update`; `fieldsV1` represents the set of managed fields. `managedFields` is not an ACL: RBAC can authorize a client to update fields owned by another manager, but an *apply* that changes another manager's field returns a conflict unless the client forces it.

### Reproducing an SSA conflict without a complex application

```bash
kubectl create namespace ssa-lab
cat > /tmp/shared-config.yaml <<'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: shared-settings
  namespace: ssa-lab
data:
  log-level: info
EOF
kubectl apply --server-side --field-manager=platform -f /tmp/shared-config.yaml
kubectl get cm shared-settings -n ssa-lab -o yaml --show-managed-fields
```

Create a second file with the same resource identity but with `log-level: debug`, then apply it as field manager `application`:

```bash
kubectl apply --server-side --field-manager=application -f /tmp/shared-config-debug.yaml
```

Expect a conflict if `platform` still owns `data.log-level`. When the value is the same, multiple appliers can share ownership. Using `--force-conflicts` transfers ownership and writes the new value. This has governance implications and should not be applied automatically in every production case.

### What happens when you omit a field from the manifest?

SSA is different from a patch that only changes a few fields. When a manager stops declaring a field it previously owned, the API server can remove the field or reset it to its default if no other manager owns it. When ownership is shared, omitting a field from one manager's manifest does not necessarily remove it from the live object.

This matters in particular for:

- `spec.replicas` when transferring ownership to an HPA;
- Lists whose merge semantics come from the schema;
- `metadata.labels` when multiple controllers add labels;
- CRD fields with defaults or nullable semantics.

### Atomic and granular ownership

SSA does not operate on YAML alone. It divides ownership according to the schema: map ownership can be granular or atomic, depending on the API specification. A map-style list uses keys to identify elements, whereas an atomic list is treated as one indivisible field. Two managers editing different elements can do so safely or run into a conflict, depending on `x-kubernetes-list-type`.

Read the schema before predicting merge behavior. Do not assume that *each line of YAML is owned independently*.

### Client-Side Apply, SSA, and Update

| Method | Where the merge is calculated | Ownership and conflict behavior |
|---|---|---|
| Traditional client-side apply | `kubectl`, using the last-applied annotation | No conflict protection equivalent to SSA |
| Server-side apply | API server, using structured field sets | Can report a conflict on a field another manager owns |
| HTTP PUT / update | Updates the object according to API semantics | Unlike apply, not rejected for SSA field conflicts; optimistic concurrency via `resourceVersion` still applies |

When migrating from client-side apply to SSA, Kubernetes provides special migration behavior for the default `kubectl` manager. Do not assume every migration will either conflict or be conflict-free.

### Production practice

1. Assign a stable `--field-manager` name to automation.
2. Do not share one manager name across controllers that have different ownership responsibilities.
3. Inspect `--show-managed-fields` output before using `--force-conflicts`.
4. Give CRDs a complete structural OpenAPI schema so ownership semantics are predictable.
5. Test the effect of removing fields from a manifest in the lab.

Verification sources: [Kubernetes Server-Side Apply](https://kubernetes.io/docs/reference/using-api/server-side-apply/), [Kubernetes API concepts](https://kubernetes.io/docs/reference/using-api/api-concepts/).

## Summary and practical implications

- Separate desired state from observed state and identify the correct owner for each field and resource.
- Do not equate a successful API operation with an external system being ready to serve traffic.
- Check IAM and RBAC, readiness, the data lifecycle, and recoverability before using this in production.

[Back to the Learning Path](../learning-path.md)
