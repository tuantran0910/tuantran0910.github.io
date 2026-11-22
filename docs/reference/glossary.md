---
title: Glossary
description: Core terms in Kubernetes platform engineering
---

| Term | Definition |
|---|---|
| Reconciliation | The loop in which a controller moves the actual state toward the desired state. |
| CRD | A Kubernetes API extension that defines new resource kinds. |
| Finalizer | A mechanism that delays resource deletion until cleanup is complete. |
| EndpointSlice | An API resource that describes a set of backend endpoints for a Service. |
| CSI | An interface that connects Kubernetes to storage providers. |
| NEG | Google Cloud Network Endpoint Group. |
| GitOps | Managing desired configuration in Git and applying it through reconciliation. |
| SLI / SLO | Service Level Indicator / Service Level Objective. |
| RPO / RTO | Recovery Point Objective / Recovery Time Objective. |
| mTLS | Mutual TLS, which authenticates both peers and encrypts the connection. |
| xDS | Discovery APIs that distribute dynamic configuration to proxies. |
| Blast radius | The set of resources or services an incident could affect. |
