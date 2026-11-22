---
title: "Lesson 18 — Kubernetes Security & Supply Chain"
sidebar_label: "Lesson 18: Kubernetes Security & Supply Chain"
sidebar_position: 18
description: "Pod Security, RBAC, WIF, SBOM, SLSA, signatures, admission."
tags: [kubernetes, platform-engineering]
last_reviewed: 2026-11-22
source_fidelity: editorial-reconstruction
---

:::info Source and editorial scope
This lesson was expanded using topics and discussion that can be verified against the conversation, but **it is not a complete verbatim transcript**. The added sections were written for the website and may require version-specific testing before use in production.
:::

## Learning objectives

Pod Security, RBAC, WIF, SBOM, SLSA, signatures, admission.

## Threat model and defense in depth

A compromised Pod can use the tokens, IAM permissions, Secrets, and network access available to its workload. Apply protection at multiple layers: CI, image provenance, admission, runtime, RBAC, IAM, and the network.

## Pod Security

Pod Security Admission (PSA) supports the `Privileged`, `Baseline`, and `Restricted` profiles in `enforce`, `warn`, and `audit` modes. Do not apply `Restricted` indiscriminately to system DaemonSets that need host access.

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 10001
  seccompProfile:
    type: RuntimeDefault
```

At the container level, drop unnecessary Linux capabilities and set `allowPrivilegeEscalation: false` and `readOnlyRootFilesystem: true` when the application supports them.

## RBAC and ServiceAccounts

Permission to create Pods or Deployments can indirectly grant access to ServiceAccounts or Secrets in the namespace. Review `escalate`, `bind`, `impersonate`, `pods/exec`, `serviceaccounts/token`, and `secrets` permissions especially carefully.

## Software supply chain

- **Digest:** identifies a specific artifact.
- **SBOM:** lists software components.
- **Provenance:** build origin, builder, source revision.
- **Cosign/Sigstore:** signing/verification.
- **SLSA:** a framework for improving build assurance.

A signature alone does not guarantee that an image is free of vulnerabilities. Admission can check for a trusted registry, an approved builder identity, valid signatures and attestations, and compliance with policy requirements.

## GitOps governance

Git write access can amount to deployment authority if Argo CD has broad permissions. Use `CODEOWNERS` and AppProjects to limit that authority, and do not let application repositories modify the platform's security boundaries.

**Official:** [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/) · [SLSA](https://slsa.dev/) · [Sigstore](https://docs.sigstore.dev/).



## Threat model: assumed compromised workload

If an attacker gains remote code execution in a Payment Pod, they can use the Secrets, cloud IAM permissions, Kubernetes API token, and network paths available to that Pod. No single control is sufficient: use a least-privilege Kubernetes ServiceAccount (KSA), tightly scoped IAM, Pod Security, runtime controls, network policies, and auditing.

### Example Restricted SecurityContext

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 10001
  seccompProfile: {type: RuntimeDefault}
containers:
  - name: payment
    image: registry.example.com/payment@sha256:REPLACE_DIGEST
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities: {drop: [ALL]}
```

This is a fragment. With `readOnlyRootFilesystem`, the application must write temporary files to appropriate writable mounts. A non-root Pod can still read Secrets or make network requests if IAM, RBAC, or NetworkPolicy rules are too permissive.

### Indirect privilege escalation through RBAC

Without additional controls, `create pods` can allow workloads to run as a highly privileged ServiceAccount in the namespace. Do not let application teams modify privileged RoleBindings or ServiceAccounts. Check access with `kubectl auth can-i`, paying particular attention to `get/list/watch secrets`, `impersonate`, `escalate`, `bind`, and `serviceaccounts/token`.

### Software Supply Chain

- A digest identifies artifact content; it does **not** prove that the artifact is safe or trusted.
- An SBOM lists dependencies.
- Provenance links an image to its source revision and builder.
- A signature establishes signer identity and artifact integrity within the scope of the trust checks.
- SLSA defines build assurance levels and their requirements.

On GKE, admission can use Binary Authorization or an equivalent policy engine to block unapproved artifacts. GitOps does not bypass admission. In production, signer allowlists must verify the identity and build workflow rather than accepting any signature.

### Runtime detection and incident response

Detection alerts for unexpected processes, abnormal egress, or unusual Kubernetes API activity need a runbook covering triage, credential rotation, forensic evidence preservation, network containment, and redeployment of trusted artifacts. Restarting a Pod alone does not stop an attacker from using credentials they have already stolen.

**Lab:** Enable Restricted PSA in a namespace and confirm it rejects a privileged Pod. Verify that the KSA cannot read Secrets, pin the image digest, and start with `warn` or `audit` before switching to `enforce`.

## Deep dive: from a compromised Pod to a supply-chain gate

### Threat model: assume a Pod has been compromised

An attacker with remote code execution in a Payment Pod may try to read mounted credentials, call the Kubernetes API using its ServiceAccount token, access cloud APIs through Workload Identity, connect to databases, and spread across the network. **Defense in depth** requires a boundary at each layer: Kubernetes RBAC, Google Cloud IAM, Pod Security, NetworkPolicy, and egress controls.

### Restricted Pod Security is a baseline, not a complete sandbox

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 10001
  seccompProfile:
    type: RuntimeDefault
containers:
  - name: app
    image: registry.example.com/payment@sha256:REPLACE_WITH_VALID_DIGEST
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: [ALL]
```

This security snippet is not a complete, valid Pod specification. If the application writes to `/tmp`, provide a writable volume at that path. `automountServiceAccountToken: false` prevents Kubernetes from automatically mounting an API token when the workload does not need one; it does not by itself prove that the workload cannot obtain cloud credentials. Manage IAM permissions for GKE Workload Identity separately.

### Indirect privilege escalation through RBAC

A developer without `get secrets` permission can still exercise the permissions of a powerful ServiceAccount indirectly if they can create Pods that use it. Creating or modifying workloads is therefore a privileged action in a tenant namespace. Give special scrutiny to `escalate`, `bind`, `impersonate`, `serviceaccounts/token`, `pods/exec`, and Secret read access.

### Secrets management

Base64 in a Kubernetes Secret is encoding, not encryption. External Secrets Operator (ESO) syncs data from Secret Manager, reducing the need to put plaintext in Git, but it does not prevent access to Secrets from a running Pod. Always consider encryption at rest, namespace RBAC, the operator's identity, rotation, and how the workload consumes the Secret.

### Supply chain integrity

| Concept | Question it answers |
|---|---|
| Image digest | What exact content does the artifact contain? |
| SBOM | What dependencies does it contain? |
| Provenance | Which source, runner, and workflow produced the build? |
| Signature | Which person or identity signed the artifact? |
| Attestation | What predicate about the artifact does a party attest to? |
| SLSA | What assurance levels does the build process meet? |

Signing an image does **not** prove that it is free of known vulnerabilities or malicious logic. The verifier must check the approved identity and issuer and the provenance predicate, not just the presence of a signature.

### Policy chain before deployment

```text
Git PR + CODEOWNERS
   → CI tests / dependency scan
   → OCI build + SBOM + provenance + signature
   → Artifact registry by digest
   → GitOps reference updates
   → Admission verification / Pod Security
   → Runtime controls + detection
```

On GKE, Binary Authorization can enforce image attestation rules. For Kubernetes-agnostic policy, Kyverno and other solutions provide image verification, depending on the version. `ValidatingAdmissionPolicy` can check fields with CEL, but it does not verify OCI signatures in a registry by default.

### Incident response when compromise is suspected

1. Identify the workload, image digest, nodes, namespace, and runtime evidence.
2. Contain traffic and isolate the affected identity according to the runbook. Do not destroy evidence before forensic capture.
3. Rotate tokens and Secret data, and revoke affected IAM permissions.
4. Verify artifact provenance and signing identity, and determine the scope of any CI compromise.
5. Rebuild from a trusted source and redeploy through a controlled process.
6. Audit cross-namespace and cloud access, and tune detection rules and policies.

### Lab

- Create a namespace with the `restricted` Pod Security profile in `enforce` mode.
- Try to deploy a privileged Pod and record the admission denial.
- Test a non-root Pod with seccomp using a compatible image.
- Check the Pod's ServiceAccount permissions with `kubectl auth can-i`.
- Use a digest rather than a tag, and check OCI metadata and Cosign verification for a lab image signed by an approved identity.

Sources: [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/), [RBAC good practices](https://kubernetes.io/docs/concepts/security/rbac-good-practices/), [Sigstore](https://docs.sigstore.dev/), [Binary Authorization](https://cloud.google.com/binary-authorization/docs/overview).

## Self-check questions

1. Which controller owns the desired state and the actual state in this lesson?
2. What failure modes can occur even when the Kubernetes resource reports `Ready`?
3. What would you verify before deploying to production?
