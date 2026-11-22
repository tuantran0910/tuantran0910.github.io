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

## Design for node, zone, and region failure separately

Self-healing replaces a failed component. HA keeps a service available through failures within its design envelope. Fault tolerance describes continued correct service despite component failure. DR restores critical service when the surviving system can no longer meet the objective. Six replicas on one node share a failure domain. Six spread across three zones may survive a zone loss only if remaining serving capacity and dependencies can carry traffic.

A kubelet reports node health through Node status and Leases. Missing heartbeats can indicate a crash, a partition or a control-plane communication failure. Kubernetes can mark the node unreachable and apply NoExecute taints. Ordinary Pods typically receive 300-second tolerations for not-ready and unreachable unless explicitly configured otherwise. Detection, eviction, replacement, scheduling, storage and readiness add independent delays. During a partition, old processes may still be running after the control plane decides they are unreachable. [Kubernetes node status](https://kubernetes.io/docs/reference/node/node-status/) · [Taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)

A StatefulSet replacement must preserve ordinal identity and single-writer safety. Establish fencing before promoting or restarting a writer on a different node. Verify whether the previous process is stopped or cannot write, verify attachment and volume topology, and follow the tested CSI or database operator procedure. Forcing object deletion based solely on a stale node status can violate the unique-identity assumption. Once safe, the scheduler places the replacement, CSI attaches and mounts storage, and PostgreSQL replays WAL as required. Readiness and an end-to-end transaction establish when the service can return. [Force-delete StatefulSet Pod considerations](https://kubernetes.io/docs/tasks/run-application/force-delete-stateful-set-pod/)

| Failure | Usually persists | Recovery constraint |
|---|---|---|
| Node loss | Other nodes and existing replicas | Detection and replacement timing, available capacity and disk placement |
| Zone loss | Regional control plane and healthy zones, when designed for the fault | Worker placement, surviving capacity, eligible topology domains and data failover |
| Kubernetes API outage | Existing containers and some programmed Service, LB and mesh paths | Scheduling, HPA, EndpointSlice changes and Argo CD sync can stall. Cached routing and credentials may age. |
| Region loss | Only independently hosted services and data that remain reachable | Standby cluster, usable backup or replication, authorization, and traffic switching |

Regional GKE replicates the control plane across zones within the region. A three-zone deployment with two Pods in each zone has four surviving Pods after one zone fails. If each reliably serves 600 requests per second, surviving capacity is 2,400 requests per second before any replacements. At 3,000 requests per second it can still overload. Test hard topology-spread constraints, eligible zones and minDomains with lost capacity. A PDB can constrain voluntary evictions such as drains. It cannot prevent an outage or add capacity. [Regional GKE clusters](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/regional-clusters)

A zonal disk couples the workload to its zone. Regional Persistent Disk synchronously replicates a logical disk between two zones. It can support storage recovery after one zone fails, subject to the attachment mode and supported failover procedure. It does not elect a database primary or provide independent database replicas. A logical deletion is still a write that can be replicated. Keep recoverable historical copies and test fencing and failback. [Regional Persistent Disk](https://docs.cloud.google.com/compute/docs/disks/about-regional-persistent-disk)

## Restore configuration and data with explicit ownership

On self-managed Kubernetes, an etcd snapshot can restore API state. Protect the snapshot and encryption keys and rehearse restoration with compatible control-plane components. In managed GKE, operational etcd backups are managed by Google and are not a workload restore interface. GitOps, Backup for GKE, and database backups provide separate recovery paths.

| Recovery input | Scope |
|---|---|
| Terraform and protected state | Replacement VPC, subnets, GKE, network access and IAM |
| GitOps and pinned bootstrap artifacts | CRDs, operators, policies and stateless desired configuration |
| BackupPlan | Defines source cluster, resource scope, schedule, retention, and inclusion options for Secrets or supported volume data |
| RestorePlan | Defines target cluster, restore scope, resource conflict behavior, and volume handling |
| Database backups and WAL | Validate application consistency and recover to a chosen point in time |
| External configuration | Restore credentials and access to Secret Manager, registry, KMS, global frontends and managed data services |

Provision or activate the recovery cluster, verify required controls and CRDs, then select which configuration comes from Git and which comes from backup. Hold workloads that can write until data recovery succeeds. Confirm CSI compatibility and external IAM, identities, DNS, credentials, and dependencies. An ExternalSecret object still needs a working operator and provider access. A restored infrastructure CR can trigger an external operation through its controller. Re-enable GitOps reconciliation only once authoritative inputs and the restore conflict policy agree. Test the recovered service before shifting traffic. [Backup for GKE](https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/concepts/backup-for-gke)

Active-passive recovery promotes a standby after fencing the old writer, checking lag, and validating the target. Active-active HTTP serving can still depend on a single database writer. For true multi-writer data, design conflict resolution, ordering and partition behavior. Failback requires reestablishing replication in the right direction, verifying synchronization, fencing the currently active writer at the agreed point, and making a separate traffic decision. [Disaster recovery architecture](https://docs.cloud.google.com/architecture/disaster-recovery)

## Run a Payment zone-loss game day

Use an isolated topology representative of production. Set a measurable RTO of 30 minutes and an RPO of five minutes for the scenario. A sample sequential plan spends three minutes detecting the problem, two declaring failover, ten activating infrastructure, ten recovering state and five validating and switching traffic. Measure the critical path rather than assuming cloud timing. Compare the last recoverable committed transaction with the incident timeline to measure actual data loss.

1. **Detect.** Check customer-facing RED signals, Load Balancer backend health, Service Health, and Kubernetes nodes, Pods, events, and EndpointSlices when the API is reachable. Distinguish zone loss from a node or control-plane connectivity failure.
2. **Contain.** Pause risky releases. Observe remaining capacity and prevent conflicting database writes. Preserve incident timestamps and evidence.
3. **Recover capacity.** Inspect scheduling and autoscaler decisions in healthy zones. Check affinity, volume placement and pool capacity before raising desired replicas.
4. **Recover data.** Check primary status, lag and attachment state, then follow the verified database or storage failover procedure with fencing. Confirm integrity and recovery point.
5. **Validate service.** Check rollout health, public probes, queue lag, errors, P95/P99, and a safe synthetic transaction. Measure RTO through business recovery.
6. **Review and fail back.** Record elapsed time, actual recovery point, SLO budget consumed and corrective actions. Plan failback separately and rehearse it.

Start game days with a stateless Pod replacement, then a test-node event, then the provider's regional zone-loss simulation. Capture readiness, endpoint convergence, node provisioning, and user impact. Run a separate restore exercise with fixture records, schema validation and WAL replay if used. Confirm data in the target before exercising traffic switching. [GKE zone failure simulation](https://docs.cloud.google.com/kubernetes-engine/docs/tutorials/simulate-zone-failure)

Continue with [Lesson 18 — Kubernetes Security & Supply Chain](../08-security-governance/lesson-18-security.md).

Practice with the [platform operations exercises](../06-compute-storage/platform-operations-exercises.mdx).

## Self-check questions

1. Which controller owns the desired state and the actual state in this context?
2. What failure modes can occur even when the Kubernetes resource reports `Ready`?
3. What would you verify before deploying to production?
