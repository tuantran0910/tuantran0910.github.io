---
title: "Helm, Kustomize, and Argo CD"
description: "Render the same application with two generators and trace release ownership."
sidebar_position: 20
tags: [gitops, helm, kustomize, argocd]
---

## Three operations in a deployment

**Render** turns source files into Kubernetes manifests. **Apply** submits those manifests to the Kubernetes API. **Reconcile** repeatedly checks desired and live state and acts according to policy. Helm templates and Kustomize overlays provide different ways to render. Argo CD runs the applicable generator and owns the GitOps delivery loop. Helm CLI can also apply manifests directly and record a Helm release.

| Question | Helm | Kustomize |
| --- | --- | --- |
| What is the source? | Versioned chart and values | Kubernetes YAML, a base, and environment overlays |
| How does configuration vary? | Values feed Go templates, which can contain conditions and loops | Overlays compose resources and change them with transformers and patches |
| How is it reused? | Publish a chart and declare dependencies | Reuse a base in one or more overlays |
| How can I preview? | `helm template` | `kubectl kustomize` |
| How can I deploy directly? | `helm install` or `helm upgrade` creates or updates a release | `kubectl apply -k` applies the built objects |

[Helm charts](https://helm.sh/docs/topics/charts/) · [Kustomize](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/)

## Render a Helm chart

Create a chart directory named `payment-chart`. Put this in `Chart.yaml`:

```yaml
apiVersion: v2
name: payment-service
version: 0.1.0
```

Put the default configuration in `values.yaml`:

```yaml
replicaCount: 1
image:
  repository: nginx
  tag: "1.27"
resources:
  cpuRequest: 100m
```

Put the production overrides in `values-prod.yaml`:

```yaml
replicaCount: 5
resources:
  cpuRequest: 500m
```

Put the following in `templates/deployment.yaml`. Nginx is a stand-in workload for this example.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
        - name: payment
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          resources:
            requests:
              cpu: {{ .Values.resources.cpuRequest | quote }}
```

```bash
helm template payment-prod ./payment-chart -n production \
  -f ./payment-chart/values-prod.yaml
```

The rendered Deployment should have five replicas and a CPU request of `500m`. It inherits the image from the default values. Running the same command without the production values file renders one replica. The destination namespace is supplied at deployment time for this chart, whose template omits `metadata.namespace`.

## Build the equivalent environment with Kustomize

Create `payment-service/base/deployment.yaml` using the rendered default Deployment from the chart example as a starting point. It is ordinary YAML with `replicas: 1`, `image: nginx:1.27` and a matching selector and Pod label. The base `kustomization.yaml` references that Deployment:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
```

Create `payment-service/overlays/dev/kustomization.yaml` with the same `apiVersion` and `kind`, a resource entry of `../../base`, and `namespace: development`. Create `payment-service/overlays/prod/kustomization.yaml` as follows:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: production
replicas:
  - name: payment-service
    count: 5
images:
  - name: nginx
    newTag: "1.28"
patches:
  - target:
      kind: Deployment
      name: payment-service
    patch: |-
      - op: replace
        path: /spec/template/spec/containers/0/resources/requests/cpu
        value: 500m
```

```bash
kubectl kustomize payment-service/overlays/dev
kubectl kustomize payment-service/overlays/prod
```

The production result declares `namespace: production`, five replicas, the updated image tag and the production CPU request. The development build inherits the base replica count and image. A named strategic merge patch can be preferable for containers if the list order might change. This JSON patch uses index zero because the example Deployment has one container.

## Give Argo CD one application source

Use a test Argo CD installation and replace the repository URL with a repository containing the example files. The destination below is the cluster that hosts Argo CD. The Application uses manual sync so you can inspect the first diff.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-prod
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/example/platform-config.git
    targetRevision: main
    path: payment-chart
    helm:
      valueFiles:
        - values-prod.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    syncOptions:
      - CreateNamespace=true
```

For the Kustomize variant, set `spec.source.path` to `payment-service/overlays/prod` and omit `spec.source.helm`. The repo server finds `kustomization.yaml` and runs a Kustomize build. Choose one variant for the exercise because both would manage the same Deployment. When you commit a change from five replicas to eight, refresh the Application and inspect `argocd app diff payment-prod`. After sync, compare the live Deployment spec and rollout status. See [Lesson 01](../01-foundations/lesson-01-foundations.md) for auto-sync, self-heal and jitter.

If a third-party Helm chart needs a patch that its values cannot express, one option is Kustomize's `helmCharts` integration, which runs Helm rendering as part of the Kustomize build. Argo CD needs `--enable-helm` in the relevant Kustomize build options or an appropriately configured Config Management Plugin. The global option affects all Kustomize applications using it. Pin the chart version and review the rendered diff before upgrading. [Argo CD Helm support](https://argo-cd.readthedocs.io/en/stable/user-guide/helm/) · [Argo CD Kustomize support](https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/)

## Follow a Helm release through installation and rollback

A chart is a reusable package. A **release** is a named installation of a chart, scoped to a namespace. A **revision** is a numbered entry in that release's history. Installing the same chart as `payment-staging` and `payment-prod` creates separate histories. With Helm's default Secret storage backend, release records appear in the release namespace with names such as `sh.helm.release.v1.payment-prod.v1`. The records contain release metadata, chart and values, and rendered manifests. Access to them can expose values, so restrict access and keep credentials out of plain-text values.

| Command | Result in this example |
| --- | --- |
| `helm install` | Revision 1 uses the initial configuration |
| First `helm upgrade` | Revision 2 uses the next configuration |
| Second `helm upgrade` | Revision 3 uses the latest configuration |
| `helm rollback payment-prod 1 -n production` | Revision 4 reapplies the configuration from revision 1 |

The release history is Helm's record of its actions. If someone scales the Deployment manually, the live spec can change without a new Helm revision. Helm CLI does not run a continuous control loop. [Using Helm](https://helm.sh/docs/intro/using_helm/) · [Helm rollback](https://helm.sh/docs/helm/helm_rollback/)

In an isolated namespace with a CLI-managed release, inspect these three views:

```bash
helm history payment-prod -n production
helm get values payment-prod -n production
helm get manifest payment-prod -n production
```

An Argo CD Helm Application uses Helm rendering and Argo CD sync. Inspect its deployment via `argocd app get` and `argocd app history`. Setting a Helm `releaseName` changes the template input without creating a Helm CLI release record. In GitOps, revert the source commit to restore a previous desired state. The Argo CD history rollback operation is policy-dependent and is unavailable while automated sync is enabled. A configuration rollback also leaves application data and database migration effects to their own recovery procedures. [Argo CD Helm](https://argo-cd.readthedocs.io/en/stable/user-guide/helm/) · [Automated sync](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)

Try the [interactive environment switcher](./gitops-exercises.mdx#render-an-environment), then deploy both variants in the [hands-on GitOps lab](./gitops-lab.md).

## Check the boundaries

1. A Helm render returns five replicas while the cluster still has one. Which step changes the cluster?
2. A GitOps Application is `Synced` while Pods are still rolling out. Which status describes the rollout?
3. An Argo CD Application uses a chart, but `helm list` reports no release. Where do you inspect its history?

The apply or sync operation writes the spec, Application health tracks rollout, and Argo CD records the history for the Applications it manages. The manifests and cluster commands are teaching examples. Run the render previews before applying them to a disposable cluster.
