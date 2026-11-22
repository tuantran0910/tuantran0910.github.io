---
title: "Lesson 15 — Kubernetes Scheduling & Autoscaling"
sidebar_label: "Lesson 15: Kubernetes Scheduling & Autoscaling"
sidebar_position: 15
description: "Scheduler Filter/Score, requests/limits, HPA, VPA, GKE autoscaling."
tags: [kubernetes, platform-engineering]
last_reviewed: 2026-11-22
source_fidelity: editorial-reconstruction
---

:::info Sources and editorial scope
This lesson builds on the topic and verifiable content from the conversation, but **it is not a complete verbatim transcript**. Supplemental material was written for the website and may require version-specific testing before use in production.
:::

## Learning objectives

Scheduler Filter/Score, requests/limits, HPA, VPA, GKE autoscaling.

## Scheduler: Filter → Score → Bind

The kube-scheduler evaluates Pods that have not yet been assigned to a Node. **Filter** eliminates Nodes that cannot meet the CPU or memory requests or that violate constraints; **Score** ranks the remaining Nodes; **Bind** assigns the Pod to a Node. The scheduler does not run containers directly.

## Requests and Limits

```yaml
resources:
  requests: {cpu: 500m, memory: 512Mi}
  limits: {cpu: '2', memory: 1Gi}
```

Scheduling uses resource requests, not just observed CPU usage. CPU usage above the quota can be throttled; exceeding the memory limit can trigger an OOM kill. The QoS classes are Guaranteed, Burstable, and BestEffort.

## Placement

- Node affinity: require or prefer placement based on labels.
- Taints and tolerations: restrict placement on Nodes; a toleration **does not force** a Pod to run on that Node.
- Topology spread: distribute replicas across Nodes or zones.
- PDB: limit voluntary evictions through the Eviction API; it does not prevent Node crashes.

## Autoscaling

HPA adjusts the replica count based on metrics; VPA recommends or adjusts resource requests; the GKE Cluster Autoscaler increases Node capacity when there are unschedulable Pods. The basic HPA formula is:

`desired = ceil(currentReplicas × observedMetric / targetMetric)`

HPA CPU utilization is based on **CPU requests**, not limits. If Argo CD and HPA both manage `spec.replicas`, separate their ownership responsibilities.

## Debugging

```bash
kubectl describe pod POD_NAME -n payments
kubectl describe node NODE_NAME
kubectl describe hpa payment-hpa -n payments
kubectl get events -A --sort-by=.lastTimestamp
```

**Official:** [Kubernetes Scheduler](https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/) · [HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/).



## Scheduler: Filter First, Then Score

The scheduler checks whether Nodes can accommodate a Pod before ranking them. If a Node does not have enough allocatable CPU to cover the Pod's **requests**, it is ineligible even if `kubectl top nodes` reports low CPU usage. The Scheduling Framework includes extension points such as PreFilter, Filter, Score, Reserve, Permit, and Bind, along with other plugin hooks.

### Requests, Limits, and Linux Enforcement

```yaml
resources:
  requests: {cpu: 500m, memory: 512Mi}
  limits: {cpu: "2", memory: 1Gi}
```

CPU limits are typically enforced through cgroup quotas and throttling; exceeding the memory limit can result in an OOM kill. The scheduler accounts for requests rather than looking only at usage or limits. Node `Allocatable` is `Capacity` minus reservations.

### Scheduling constraints

- `nodeSelector` and required node affinity are hard placement constraints.
- A toleration lets a Pod run on a Node with a matching taint, but does not require the scheduler to select that Node.
- `TopologySpreadConstraints` can distribute replicas evenly by zone or hostname, but a hard `DoNotSchedule` constraint can leave Pods Pending during an outage.
- A PDB does not prevent Node crashes; priority and preemption do not resolve a storage zone mismatch.

### From HPA to Node Autoscaling

```text
HPA computes desired replicas → Deployment creates Pods → Scheduler tries to place
  → Pending Pods can trigger Cluster Autoscaler → Node provision → scheduling resumes
```

HPA CPU utilization is based on the ratio of usage to requests. Setting a low request increases utilization even when absolute usage is not high. The HPA metrics API, missing metrics, and stabilization windows affect actual scaling. The Cluster Autoscaler cannot fix a ResourceQuota violation or accommodate a Pod whose request exceeds the capacity of every Node template.

### VPA/HPA coordination

VPA adjusts resource requests, while HPA adjusts the replica count. When HPA uses CPU utilization and VPA adjusts CPU requests, the control loops can react to each other. Start VPA in recommendation-only mode, or use application-level metrics for HPA, and then test scaling stability.

**Lab:** Deliberately create a Pod with an excessive resource request; inspect `FailedScheduling` events and Node Allocatable. Enable HPA with metrics-server and compare its behavior after changing `requests.cpu`.

## Deep Dive: Scheduling Framework and Linux cgroups

### What Steps Does the Scheduler Actually Take?

Scheduling a new Pod typically starts in a queue. The Scheduling Framework includes `QueueSort`, `PreFilter`, `Filter`, `PostFilter` (where preemption may be attempted), `PreScore`, `Score`, `Reserve`, `Permit`, `PreBind`, `Bind`, and `PostBind`. Not every extension point always has an active plugin. Some extension points belong to the scheduling cycle and others to the binding cycle.

```text
Pod Pending (spec.nodeName empty)
   ↓ scheduler queue
Filter candidate Nodes: CPU/memory requests, volume, taints, affinity
   ↓ feasible Nodes
Score candidates: spread/resources/affinity weights
   ↓ chosen Node
Reserve/Permit/PreBind/Bind
   ↓ Pod.spec.nodeName
Kubelet on Node starts containers
```

The scheduler determines feasibility primarily by comparing **resource requests** with `NodeAllocatable`, not by looking at the usage reported by `kubectl top node`. For example, a Node with 8 allocatable CPUs and existing requests totaling 7 CPUs can leave a new Pod requesting 2 CPUs Pending, even if the workloads currently use only 1 CPU. Remember to account for DaemonSet requests, Pod overhead, init-container resource accounting, and the maximum Pods per Node.

### QoS, cgroups, and Eviction

| QoS | Typical criteria | Implications |
|---|---|---|
| Guaranteed | CPU and memory requests equal their respective limits for each applicable container | Receives preferential treatment under resource pressure rules |
| Burstable | Has requests or limits but does not qualify as Guaranteed | Uses resources flexibly and is evaluated based on usage, requests, and priority |
| BestEffort | Has no CPU or memory requests or limits | Has no guaranteed resources |

CPU limits are typically enforced through cgroup bandwidth control, which throttles workloads that exceed their quota within a window. A memory limit can trigger an OOM kill if allocation exceeds it; memory is not throttled by the same mechanism as CPU. An `OOMKilled` status alone does not prove a memory leak. Check peak usage, buffers, concurrency, sidecars, and how the limit was sized.

### Placement: Hard and Soft Constraints

```yaml
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
        - matchExpressions:
            - key: workload-tier
              operator: In
              values: [critical]
```

`required` enforces placement; `preferred` only raises the score. `tolerations` remove the barrier imposed by taints but do not *attract* Pods to tainted Nodes. Add labels and affinity rules if you need a dedicated group of Nodes.

Topology spread:

```yaml
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: payment
```

If zones lack enough Nodes, a hard spread constraint can leave Pods Pending; `minDomains`, eligible domains, and node affinity and taint policies affect the outcome. A PDB limits voluntary evictions but does not prevent crashes or zone outages.

### HPA: Formula and Assumptions

With 4 current replicas, average CPU utilization of 80%, and a target of 60%:

```text
desired = ceil(4 × 80 / 60) = 6 replicas
```

If each Pod requests 250m of CPU and uses 200m, utilization is 80%. Raising the request to 500m while usage stays at 200m drops utilization to 40%, changing the HPA decision. In practice, HPA also accounts for missing metrics, Pods that are not yet ready, tolerance, scaling policies, stabilization windows, and minimum and maximum replica counts. HPA does not scale directly based on CPU limits.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment
  namespace: payments
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
```

Metrics Server must provide resource metrics; without a metric, HPA may not behave as expected. In queueing systems, CPU may not reflect saturation, so consider custom or external metrics such as queue lag or in-flight requests.

### VPA and the Cluster Autoscaler

VPA right-sizes container requests and limits according to the supported mode. Running with `updateMode: Off` to collect recommendations is a safe audit step. Combining HPA's CPU utilization metric with VPA changes to CPU requests can lead to hard-to-predict interactions between the controllers. The GKE Cluster Autoscaler adds Nodes when the scheduler cannot place Pods and adding a Node would help. It cannot add usable capacity if quotas, available IPs, maximum Node pool size, taints or affinity, or resource requests make placement impossible.

### Debug playbook

```bash
kubectl get pods -A --field-selector=status.phase=Pending
kubectl describe pod POD -n payments
kubectl describe node NODE
kubectl get events -A --sort-by=.lastTimestamp
kubectl top pods -A --containers
kubectl describe hpa payment -n payments
kubectl get priorityclasses,pdb -A
```

**Production scenario:** Argo Rollouts uses `maxSurge` and needs extra Pods. An Envoy sidecar adds a 100m CPU request, and a hard topology spread constraint spans three zones, one of which is experiencing an outage. HPA wants 12 replicas, but the quota only allows 10. Scaling the Node pool alone resolves neither the quota nor the spread constraint. Check each constraint in the controller responsible for it before changing the infrastructure.

Sources: [Scheduling Framework](https://kubernetes.io/docs/concepts/scheduling-eviction/scheduling-framework/), [Manage resources](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/), [HPA](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/), [GKE autoscaler](https://cloud.google.com/kubernetes-engine/docs/concepts/cluster-autoscaler).

## Self-Check Questions

1. Which controller owns the desired state and the actual state in this context?
2. What failure modes can occur even when the Kubernetes resource reports `Ready`?
3. What would you verify before deploying to production?
