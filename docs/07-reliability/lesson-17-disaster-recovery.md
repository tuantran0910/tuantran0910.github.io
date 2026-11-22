---
title: "Lesson 17 — High Availability & Disaster Recovery"
sidebar_label: "Lesson 17: High Availability & Disaster Recovery"
sidebar_position: 17
description: "Node/zone failures, regional GKE, RPO/RTO, backup and failover."
tags: [kubernetes, platform-engineering]
last_reviewed: 2026-11-22
source_fidelity: editorial-reconstruction
---

:::info Sources and editorial scope
This lesson builds on the topic and verifiable content from the conversation, but **it is not a complete verbatim transcript**. Supplemental material was written for the website and may require version-specific testing before use in production.
:::

## Learning objectives

Node/zone failures, regional GKE, RPO/RTO, backup and failover.

## High Availability vs. Disaster Recovery

High availability (HA) keeps a service running through component failures within its design limits. Disaster recovery (DR) restores it after a larger incident. The design must specify the **failure domain**: Pod, Node, zone, region, cloud project, or external dependencies.

## Node failure

When the kubelet stops sending heartbeats, the Node may become `Unknown` or `NotReady`. `NoExecute` taints and Pod tolerations affect how quickly a Pod is evicted and replaced. A network partition does not prove that a process on the Node has stopped: force-deleting a stateful Pod can cause split-brain.

## Regional GKE Does Not Provide Database HA by Itself

A regional control plane is replicated across zones, but workloads still need topology spread and sufficient capacity in the surviving zones. Zonal disks are constrained to their zone. Regional Persistent Disk can replicate data across two zones, but **it does not provide database failover or backups on its own**.

## RPO / RTO

- **RPO:** the target for maximum acceptable data loss.
- **RTO:** the target for how long it takes to restore service functionality.

Recovery includes detection, containment, infrastructure recovery, data restoration or failover, validation, and traffic cutover. The total elapsed time must meet the RTO.

## Managed GKE etcd

Do not design DR around downloading and restoring snapshots of etcd managed by GKE yourself. Combine Terraform, GitOps, Backup for GKE, application backups, and cloud resource recovery.

## Minimum DR Runbook

1. Confirm the scope of the failure: Node, zone, or region.
2. Pause changes that would increase risk.
3. Fence the old primary database if necessary.
4. Add capacity and recover the data.
5. Check business transactions, SLOs, and the error budget.
6. Switch traffic, then measure actual RPO and RTO.
7. Conduct regular Game Days and restore tests.

**Official:** [GKE Regional Clusters](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/regional-clusters) · [Backup for GKE](https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/concepts/backup-for-gke).



## Node failure vs Network partition

A Node that stops sending heartbeats may still be running processes. The `not-ready` and `unreachable` taints and their tolerations can delay eviction. Before replacing a single-writer database Pod, fence the old instance to prevent split-brain. Never force-delete a StatefulSet Pod holding the primary data volume until you know the old instance has stopped writing.

### Regional HA

A regional GKE cluster improves control plane availability across zones, but it does not make the application or database highly available on its own. Worker Nodes, topology spread, storage, and remaining capacity must still support the load if a zone becomes unavailable. Regional Persistent Disk replicates data across zones; that does not make the database a multi-writer system.

### When the API Server Is Unavailable

Existing containers and the data plane usually continue to run with their current configuration. However, resource creation and deletion, scheduling, GitOps synchronization, HPA, and endpoint reconciliation can be disrupted. Control plane HA helps keep management operations available; it does not guarantee end-to-end service availability.

### Treat RTO as a Time Budget

```
RTO = detect + decide + prepare + restore + validate + switch traffic
```

If the RTO is 30 minutes but restoring the database takes 25 minutes and provisioning takes 20 minutes, the design needs to change. Options include standby capacity, pre-provisioned infrastructure, or database replication. RPO depends on backup or replication consistency, not on whether Pods are `Ready`.

### DR Runbook

1. Detect incident scope: Pod/Node/Zone/Region/Data.
2. Contain: freeze risky changes, fence old primary if necessary.
3. Recover compute/network capacity.
4. Recover data according to RPO using snapshots/database-native PITR.
5. Validate application transactions and load balancing paths.
6. Shift production traffic only after health criteria met.
7. Measure actual RTO/RPO and write postmortem.

**Lab:** Fail one stateless Pod, measure EndpointSlice convergence and HTTP errors. On staging, simulate zone loss with cloud-provider supported method, not by deleting production VMs.

## Deep Dive: Simulating Incidents by Failure Domain

### Node Failure Is More Than a Pod Restart

The kubelet sends heartbeats and renews Node Leases. If communication stops, the Node controller can mark the Node `Unknown` or `NotReady` and add the corresponding `NoExecute` taints. The default Pod tolerations for `not-ready` and `unreachable` typically allow about 300 seconds before eviction under the applicable policy. Actual recovery time also includes detection, deletion, scheduling, provisioning, and startup. Do not treat 300 seconds as a guaranteed RTO.

```text
Node partitioned → heartbeats lost → Node condition changes
    → taints / toleration period → Pod deletion/eviction
    → workload controller creates replacement → scheduler/kubelet
```

**Split-brain:** The old Node may still be running the database even if it cannot reach the API server. Do not force-delete the primary StatefulSet Pod before fencing the old instance. Depending on the architecture, fencing can involve ensuring that the VM is powered off, detaching storage, or revoking a database role.

### Zone Failure in Regional GKE

A regional GKE cluster provides control plane availability across zones. To withstand a zone failure, an application also needs:

- Replicas distributed using topology spread.
- Enough Node capacity in the remaining zones for critical traffic.
- Storage topology compatible with the StatefulSet.
- Continued availability of dependencies such as Cloud SQL, Secret Manager, DNS, and the load balancer.
- Sufficient quota, IP addresses, and Node pool capacity for HPA and the Cluster Autoscaler.

For example, with six Pods spread evenly across three zones, four remain after one zone fails. If the workload needs six Pods to handle peak traffic, even distribution alone does not guarantee the SLO. Spare capacity is part of the HA budget.

### Control Plane Outages and the Data Plane

If the Kubernetes API server is unavailable but the Nodes are still running, containers may continue handling existing traffic using the data plane's current state. However, Argo CD synchronization, HPA reconciliation, scheduler binding, EndpointSlice updates, and resource admission are affected. Control plane availability is not the same as application availability or the ability to recover automatically when Pods fail.

### RPO and RTO

- RPO: the maximum acceptable data loss in a defined failure scenario.
- RTO: the maximum acceptable time to restore business functionality after an incident.

A time budget might include detection (3 minutes) + declaring failover (2) + provisioning (10) + restoring the database (10) + validation and traffic routing (5) = 30 minutes. This is an illustration. Measure actual recovery during a Game Day and record the start and end times against clear criteria.

### Backup for GKE vs database-native backup

Backup for GKE helps back up and restore Kubernetes resources and supported volume data. It does not automatically back up all Google Cloud IAM, VPC, or Cloud SQL resources, nor does it guarantee database PITR. Application teams should not rely on provider-managed GKE etcd backups as a recovery source they can use directly. Combine:

```text
Terraform (infrastructure) + GitOps (Kubernetes desired config)
+ Backup for GKE (eligible resources/volume data)
+ DB backup/WAL (transactional data & PITR)
```

### Sample Runbook

| Phase | Checkpoint | What to avoid |
|---|---|---|
| Detection | Node/Zone/Region/DB failure domain | Relying on the status of a single Pod |
| Containment | Freeze changes, fence old writer | Force-deleting a data Pod without proper checks |
| Capacity | Surviving zones Nodes ready, endpoints healthy | Scaling replicas beyond the quota without checking it |
| Data | Restore/replication lag, database integrity | Assuming the database is ready because the PV is `Bound` |
| Traffic | LB/NEG/Gateway healthy, synthetic transactions | Switching all traffic before validation |
| Review | Actual RPO/RTO, error budget, evidence | Declaring DR complete just because a snapshot exists |

### Running a Safe Game Day

In staging, delete one stateless Pod and measure EndpointSlice convergence and the error rate. Simulate the loss of a zone using the provider's method. Restore a backup into an isolated cluster and verify transaction records. Record the recovery timeline. Do not simulate failures by destroying production disks or force-deleting a database Pod without proper controls.

Sources: [GKE regional clusters](https://cloud.google.com/kubernetes-engine/docs/concepts/regional-clusters), [GKE simulated zone failure](https://cloud.google.com/kubernetes-engine/docs/tutorials/simulate-zone-failure), [Backup for GKE](https://cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/concepts/backup-for-gke).

## Self-Check Questions

1. Which controller owns the desired state and the actual state in this context?
2. What failure modes can occur even when the Kubernetes resource reports `Ready`?
3. What would you verify before deploying to production?
