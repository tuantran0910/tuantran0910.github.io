---
title: "Hands-on GitOps Lab with Argo CD"
sidebar_position: 21
tags: [gitops, argocd, helm, kustomize]
---

## What you will verify

Follow one Deployment through source rendering, live-state comparison, synchronization, rollout, drift repair, and multi-cluster delivery. You will use one Argo CD control plane. It initially manages the local cluster, then an ApplicationSet generates an Application for a second cluster.

You need Docker running, `kind`, `kubectl`, Helm, the Argo CD CLI, and a Git repository accessible to the repo server. Use a dedicated lab repository and clusters. Copy the full chart and Kustomize tree from [Helm, Kustomize, and Argo CD](./helm-kustomize.md) into the repository and push them to `main`. Replace the example repository URL throughout this lab. For a private repository, configure Argo CD repository credentials outside the Git tree.

## 1. Bootstrap the management cluster

Pick a supported Argo CD release and use the same version for the server and CLI. Replace `vX.Y.Z` below with that release tag. Keep cluster contexts explicit.

```bash
kind create cluster --name gitops-lab
kubectl --context kind-gitops-lab create namespace argocd
ARGOCD_VERSION=vX.Y.Z
kubectl --context kind-gitops-lab -n argocd apply --server-side \
  -f "https://raw.githubusercontent.com/argoproj/argo-cd/${ARGOCD_VERSION}/manifests/install.yaml"
kubectl --context kind-gitops-lab -n argocd rollout status deployment/argocd-server
kubectl --context kind-gitops-lab -n argocd port-forward svc/argocd-server 8080:443
```

Leave the port forward running. In another terminal, use `kubectl --context kind-gitops-lab -n argocd get secret argocd-initial-admin-secret -o go-template='{{.data.password | base64decode}}{{"\n"}}'` to get the initial password locally. Run `argocd login localhost:8080 --username admin --insecure` and enter it at the prompt. The insecure flag is for this local, self-signed lab endpoint. [Argo CD getting started](https://argo-cd.readthedocs.io/en/stable/getting_started/) · [kind quick start](https://kind.sigs.k8s.io/docs/user/quick-start/)

## 2. Establish a baseline and ship a new revision

Save the Helm Application from the companion guide as `payment-prod.yaml`, then apply it to the management cluster. Keep manual sync for this phase.

```bash
kubectl --context kind-gitops-lab apply -f payment-prod.yaml
argocd app get payment-prod --refresh
argocd app diff payment-prod
argocd app sync payment-prod
argocd app wait payment-prod --sync --health --timeout 180
kubectl --context kind-gitops-lab -n production get deployment payment-service
```

Before the first sync, the Application should list a Deployment that is missing or `OutOfSync`. After sync and rollout, expect five desired replicas and five available replicas. If the Application reports a comparison error, check the source URL, branch, repository credentials, chart path and values filename. If it is `Synced` but unhealthy, use `kubectl describe deployment` and inspect Pod events for scheduling or image-pull failures.

In `payment-chart/values-prod.yaml`, add an image override:

```yaml
image:
  tag: "1.28"
```

Commit and push the change. Refresh the Application, record the detected revision and compare the desired image to the live Deployment. Manual sync should leave the previous image live until you issue `argocd app sync payment-prod`. After the sync, `kubectl --context kind-gitops-lab -n production rollout status deployment/payment-service` confirms Kubernetes finished replacing Pods. `argocd app history payment-prod` shows the deployment history.

## 3. Observe drift with self-heal off and on

Enable automated sync without self-heal and wait for the Application to be synced at the current Git revision.

```bash
kubectl --context kind-gitops-lab -n argocd patch application payment-prod \
  --type merge -p '{"spec":{"syncPolicy":{"automated":{"selfHeal":false}}}}'
kubectl --context kind-gitops-lab -n production scale deployment/payment-service --replicas=2
argocd app get payment-prod --refresh
argocd app diff payment-prod
```

With this single-source Application and an unchanged, previously synced revision, expect the diff to show desired five versus live two. Record the replica count, then enable self-heal:

```bash
kubectl --context kind-gitops-lab -n argocd patch application payment-prod \
  --type merge -p '{"spec":{"syncPolicy":{"automated":{"selfHeal":true}}}}'
argocd app wait payment-prod --sync --health --timeout 180
kubectl --context kind-gitops-lab -n production get deployment payment-service
```

Expect five desired replicas again. If there is no drift, check for an HPA, a field ignore rule, or another writer. If drift persists, examine the Application conditions, last operation state, destination permissions and sync policy. Then commit `replicaCount: 6` once and watch auto-sync apply a Git-driven change. Record both the revision and the time when Pods become ready. [Automated sync semantics](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)

## 4. Switch the same Application to Kustomize

Change the local Application manifest to use `payment-service/overlays/prod`, remove its `helm` block, and apply it again. Keep the Application name and destination unchanged. Confirm the overlay renders the same Deployment name and selector before applying it. Inspect the diff, sync manually if automated sync is disabled, and verify the overlay's replica count and image. Check that only one Argo CD Application owns the Deployment in this namespace. Compare the rendered manifests before the switch so you can distinguish generator changes from changes in the desired workload.

## 5. Generate an Application for a second cluster

Create a second cluster on the same kind Docker network. Use the node's internal Docker address for the controller's API connection. kind's host kubeconfig typically advertises a loopback endpoint, which points back to the controller Pod when used inside it.

```bash
kind create cluster --name gitops-target
TARGET_IP=$(docker inspect -f '{{(index .NetworkSettings.Networks "kind").IPAddress}}' gitops-target-control-plane)
TARGET_SERVER="https://${TARGET_IP}:6443"
```

This disposable lab uses a dedicated ServiceAccount with cluster-wide access so Argo CD can discover resources and create the destination namespace. Limit access and use an appropriate credential lifecycle for a persistent cluster. Kubernetes populates the token Secret asynchronously. Check that it contains both `token` and `ca.crt` before creating the registration.

```bash
kubectl --context kind-gitops-target -n kube-system create serviceaccount gitops-lab-argo
kubectl --context kind-gitops-target create clusterrolebinding gitops-lab-argo \
  --clusterrole=cluster-admin --serviceaccount=kube-system:gitops-lab-argo
kubectl --context kind-gitops-target apply -f - <<'YAML'
apiVersion: v1
kind: Secret
metadata:
  name: gitops-lab-argo-token
  namespace: kube-system
  annotations:
    kubernetes.io/service-account.name: gitops-lab-argo
type: kubernetes.io/service-account-token
YAML
kubectl --context kind-gitops-target -n kube-system get secret gitops-lab-argo-token \
  -o go-template='{{range $key, $_ := .data}}{{$key}}{{"\n"}}{{end}}'
```

Run the following with shell tracing disabled. The token is passed through standard input to the local Kubernetes client. Avoid printing or committing either registration Secret.

```bash
register_target() {
  local target_token target_ca
  target_token=$(kubectl --context kind-gitops-target -n kube-system get secret gitops-lab-argo-token \
    -o go-template='{{if index .data "token"}}{{index .data "token" | base64decode}}{{end}}') || return 1
  target_ca=$(kubectl --context kind-gitops-target -n kube-system get secret gitops-lab-argo-token \
    -o go-template='{{index .data "ca.crt"}}') || return 1
  if [ -z "$TARGET_IP" ] || [ -z "$target_token" ] || [ -z "$target_ca" ]; then
    printf 'Target address or credentials are pending. Verify the Docker network and Secret, then retry.\n' >&2
    return 1
  fi
  printf '{"bearerToken":"%s","tlsClientConfig":{"insecure":false,"caData":"%s"}}' "$target_token" "$target_ca" |
    kubectl --context kind-gitops-lab -n argocd create secret generic gitops-target-registration \
      --from-literal=name=gitops-target --from-literal=server="$TARGET_SERVER" --from-file=config=/dev/stdin || return 1
  kubectl --context kind-gitops-lab -n argocd label secret gitops-target-registration \
    argocd.argoproj.io/secret-type=cluster gitops-lab-target=true
}
register_target
kubectl --context kind-gitops-lab -n argocd get secrets \
  -l argocd.argoproj.io/secret-type=cluster
argocd cluster list
```

If connection fails, verify the address is reachable from the management cluster and appears in the target API certificate's subject alternative names. On a different runtime or network layout, use an endpoint covered by the certificate and reachable from the controller. [Declarative cluster registration](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#clusters) · [ServiceAccount credentials](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)

Apply this ApplicationSet in the management cluster:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: payment-lab-targets
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - clusters:
        selector:
          matchLabels:
            gitops-lab-target: "true"
  template:
    metadata:
      name: '{{.nameNormalized}}-payment'
    spec:
      project: default
      source:
        repoURL: https://github.com/example/platform-config.git
        targetRevision: main
        path: payment-service/overlays/prod
      destination:
        server: '{{.server}}'
        namespace: production
      syncPolicy:
        syncOptions:
          - CreateNamespace=true
```

Expect exactly one generated Application alongside `payment-prod`. Inspect its destination and sync it. Verify `kubectl --context kind-gitops-target -n production get deployment payment-service` reports the Deployment on the second cluster. If the ApplicationSet produces zero Applications, inspect its conditions and the cluster Secret label. If it generates an Application that cannot compare or sync, check reachability, certificate trust, and destination credentials. [ApplicationSet cluster generator](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/)

## Exit checks and rollback

- Record the source revision and image before and after sync.
- Explain why an Application can report `Synced` while a rollout is still progressing.
- Record both results of the scale test and the sync policy used in each case.
- Verify each Deployment using its own cluster context.
- Revert one lab commit, then sync the affected Applications and confirm the previous desired image or replica count returns.
- Stop the port forward when finished. Once you have collected your results, remove only the disposable kind clusters you created for this lab.
