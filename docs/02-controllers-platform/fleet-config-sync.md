---
title: "Argo CD, Config Sync, and GKE Fleet Management"
description: "Choose reconciliation boundaries and organize Kubernetes configuration across clusters."
sidebar_position: 20
tags: [gitops, gke, config-sync]
---

## Choose the controller by its operational role

Argo CD and Config Sync both reconcile Kubernetes resources from declared sources. Argo CD organizes work around **Applications** and their delivery lifecycle. Config Sync organizes work around **configuration sources** and the clusters or namespaces that receive them. Both can deliver a Deployment or a NetworkPolicy. The operational differences matter when deciding who owns each object and how operators diagnose a release.

| Capability | Argo CD | Config Sync |
| --- | --- | --- |
| Unit of management | `Application`; `ApplicationSet` can generate many Applications | `RootSync` and `RepoSync` connect sources to reconcilers |
| Runtime placement | Application controller connects to registered destination clusters | Reconcilers run on each configured cluster |
| Source and generation | Git-hosted YAML, Helm charts, Kustomize, and other supported sources | Git, OCI, or Helm sources, with rendering behavior dependent on the source and configuration |
| Drift | Comparison reports drift; automated self-heal can apply desired state again | Reconcilers maintain managed resources; optional drift prevention can reject conflicting changes |
| Status | Application sync, health, revision, and operation history | Source, rendering and sync conditions, resource inventory, and fleet visibility |
| Rollback | Revert Git or use Application rollback where supported by the sync policy | Revert or repin the source and let the reconciler apply the resulting revision |
| Ordering | Sync phases, hooks and waves; for example a `PreSync` migration Job | Resource configuration and reconciliation status, with a different operational model from Argo CD hooks |
| Typical fit | Application delivery, including across clouds | Shared cluster configuration and governance on GKE |

See [Config Sync overview](https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/overview), [Config Sync architecture](https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/concepts/architecture), and [Argo CD architecture](https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/).

## What a fleet groups

A Google Cloud **Fleet** groups registered Kubernetes cluster memberships. **Fleet management** uses that grouping for common administration, feature configuration and visibility. Each member retains its own Kubernetes API, workloads, storage and lifecycle. Fleet registration enables a management boundary. Workload placement and configuration still depend on the features you enable and the sources you assign.

Consider ten GKE clusters running thirty services. Three clusters serve development, two serve staging, and five serve production. Shared platform configuration might define a `payments` namespace, resource quotas, default NetworkPolicies and standard RBAC. A staging configuration can stretch quotas for load testing while production uses a separately approved policy revision.

Grouping all ten in one fleet is an illustrative option. Review shared trust and namespace ownership first. Some fleet features treat namespaces with the same name as logically equivalent across member clusters. Separate production and non-production fleets can better reflect different trust and lifecycle boundaries. [How fleets work](https://docs.cloud.google.com/kubernetes-engine/fleet-management/docs/fleet-concepts)

## RootSync, RepoSync, and ApplicationSet

- **RootSync** points a root reconciler at a source. Use it for centrally managed resources, including cluster-scoped resources and shared namespace foundations. Review who can edit the source and the reconciler's effective permissions.
- **RepoSync** points a namespace reconciler at a source. It supports delegation within one namespace, subject to the reconciler's Kubernetes permissions. For example, a payments team can maintain its namespace-scoped configuration while the platform team owns the namespace and baseline policies.
- **ApplicationSet** generates Argo CD Applications. A cluster generator can select Argo CD cluster registrations by labels such as `environment=prod`. The generated Applications reference their intended revisions and destinations. This addresses multi-cluster application placement. Fleet membership comes from Google Cloud registration. [ApplicationSet generators](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/)

## One ownership map for the payment platform

| Desired object | Source owner | Reconciler | Evidence of success |
| --- | --- | --- | --- |
| GKE cluster and baseline network | Infrastructure team | Terraform pipeline | Infrastructure deployment succeeds and the cluster registers |
| Namespace, quota, default policy, shared RBAC | Platform team | Config Sync | Expected source revision and successful sync on selected clusters |
| `StorageBucket` Custom Resource | Platform team | Config Sync in a designated infrastructure cluster | The intended CR exists in Kubernetes |
| Actual Cloud Storage bucket | Platform team | Config Connector | CR status reflects the current generation and the bucket exists with the expected settings |
| Payment Deployment and Service | Payments team | Argo CD | Application is `Synced` and `Healthy` |

Deploy the bucket declaration once through a designated controller unless each target is supposed to provision distinct infrastructure. Repeating the same CR in every fleet cluster can make independent controllers act on the same cloud resource. Similarly, two GitOps sources that both own the same Kubernetes object can disagree about its fields, inventory and deletion. Assign an authoritative source before enabling automated cleanup. A smaller platform can use Argo CD for both application and platform objects by assigning clear ownership and access boundaries.

## Read-only verification

Use a test cluster with Config Sync and Argo CD configured. Select contexts explicitly when the Argo CD management cluster differs from the workload cluster.

```bash
kubectl --context gke-lab get rootsyncs -A
kubectl --context gke-lab get reposyncs -A
kubectl --context gke-lab -n payments get resourcequota,networkpolicy,rolebinding
argocd app get payment-prod
```

If a policy is absent, confirm three things in order: the cluster received the expected source configuration, the expected revision rendered successfully, and the reconciler had permission to apply the object. If the payment rollout stalls after sync, check workload health separately, then verify the cloud dependency from [Lesson 05](./lesson-05-platform-integration.md). These examples use placeholder contexts and application names.
