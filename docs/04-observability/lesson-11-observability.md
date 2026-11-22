---
title: "Lesson 11 — Kubernetes Observability & SRE Fundamentals"
sidebar_label: "Lesson 11: Kubernetes Observability & SRE Fundamentals"
sidebar_position: 11
description: "Prometheus, OpenTelemetry, RED/USE, SLIs, SLOs, and error budgets."
tags: [kubernetes, platform-engineering]
last_reviewed: 2026-11-22
source_fidelity: editorial-reconstruction
---

:::info Sources and editorial scope
This lesson expands on the topic and verifiable content of the conversation, but it is **not a complete verbatim transcript**. Additional material was written for this website and may require version-specific testing before use in production.
:::

## Learning objectives

Prometheus, OpenTelemetry, RED/USE, SLIs, SLOs, and error budgets.

## Metrics, logs, traces

- **Metrics:** How many requests are there, what fraction fail, and what is their latency?
- **Logs:** What specific events occurred?
- **Traces:** Which services and databases did the request pass through, and how long did it take?

## Prometheus

Prometheus scrapes metrics over time. Each combination of metric name and labels is a time series. Avoid labels such as `user_id` or `request_id` because they have high cardinality.

```promql
sum(rate(http_requests_total{service="payment"}[5m]))
```

HTTP 5xx rate:

```promql
sum(rate(http_requests_total{service="payment",status=~"5.."}[5m]))
/
sum(rate(http_requests_total{service="payment"}[5m]))
```

Classic histogram P95 latency:

```promql
histogram_quantile(0.95,
  sum by (le) (rate(http_request_duration_seconds_bucket{service="payment"}[5m])))
```

## SLIs, SLOs, and Error Budgets

If the availability SLO is 99.9%, the allowed failure fraction is 0.001. For one million eligible requests, the error budget is 1,000 failed requests. The **burn rate** is the observed error rate divided by the allowed error rate. Alerts should combine long and short windows rather than react only to brief spikes.

## OpenTelemetry

Instrument the application with the OpenTelemetry SDK. The Collector receives, processes, and exports signals to backends. Prometheus does not need a Collector to scrape metrics.

**Official:** [Prometheus](https://prometheus.io/docs/introduction/overview/) · [OpenTelemetry](https://opentelemetry.io/docs/collector/architecture/) · [SRE Workbook](https://sre.google/workbook/alerting-on-slos/).



## Building an SLO from the user's perspective

An example SLO for the Payment API is 99.9% successful payment requests over a rolling 30-day window. Define the SLI numerator, denominator, and filters explicitly: Do client-caused 4xx responses count as failures? Distinguish total traffic from eligible requests. Define the metric before setting the threshold.

### Error budget

For 99.9% availability over a 30-day window, the theoretical downtime budget is `30 × 24 × 60 × (1 - 0.999) = 43.2 minutes`. This time-based example assumes every minute counts equally; a request-based SLO can give a different result.

### RED/USE

- **RED:** Rate, Errors, and Duration for request-driven systems.
- **USE:** Utilization, Saturation, and Errors for resources such as CPU, memory, disks, and networks.
- **Four Golden Signals:** Latency, Traffic, Errors, Saturation.

```promql
sum(rate(http_requests_total{service="payment",status=~"5.."}[5m]))
/
sum(rate(http_requests_total{service="payment"}[5m]))
```

This PromQL example is illustrative; the labels and counters must exist in your actual instrumentation. Handle a zero denominator in alerting rules to avoid NaN or missing results.

### Prometheus vs OpenTelemetry

Prometheus typically collects and queries metrics; OpenTelemetry defines APIs, SDKs, and a Collector for traces, metrics, and logs. Distributed tracing helps pinpoint where latency accumulates along Payment → Order → Inventory; correlation IDs link a request across services. Exemplars can link metric spikes to traces when the pipeline supports them.

### Alert design

Alert on error-budget burn rate instead of relying only on `CPU > 80%`. Use multi-window, multi-burn-rate alerts to detect both rapid and sustained burn. Then write a runbook with links to dashboards, logs, and traces and steps for verifying user impact.

**Lab:** Instrument a demo HTTP service with OpenTelemetry, expose metrics and traces, simulate 5xx responses and elevated latency, and compare `kubectl top` with the request SLI.

## Deep dive: From metrics to useful SLOs

### Three basic signals

- **Metrics:** Quantitative measurements over time, such as RPS, error rate, CPU utilization, and queue lag.
- **Logs:** Detailed events that help investigate specific causes. Take care not to expose PII or secrets.
- **Traces:** Correlate multiple spans in a distributed request. The `trace_id` links spans from ingress → payment → order → database.

Do not rely on logs alone to calculate a latency SLO at scale, and do not assume that every request is traced when sampling is enabled.

### RED and USE

| Method | Components | Examples |
|---|---|---|
| RED for services | Rate, Errors, Duration | RPS, 5xx rate, P99 latency |
| USE for resources | Utilization, Saturation, Errors | CPU usage, CPU throttling, disk I/O errors |

### Designing an SLI and SLO for Payment

Choose an availability SLI: the fraction of eligible requests that complete successfully, using the business definition of success. Example SLO: **99.9% of eligible requests succeed over 30 days**. The error budget is 0.1% of the requests in scope. That is not necessarily equivalent to 0.1% of the minutes, because traffic patterns vary.

With 1,000,000 eligible requests in the measurement window, a 0.1% budget allows 1,000 unsuccessful requests. If traffic is evenly distributed, 99.9% time-based availability corresponds to about 43.2 minutes of downtime in a 30-day month. This is still a time-based SLI and cannot always replace a request-based SLI.

### PromQL and histograms

A histogram-based P95 query might look like this:

```promql
histogram_quantile(
  0.95,
  sum by (le) (
    rate(http_server_request_duration_seconds_bucket{service="payment"}[5m])
  )
)
```

This query assumes a classic histogram with the `_bucket` suffix, the `le` label, and the metric name shown. The query is different for native histograms. Check the buckets and sample counts: `histogram_quantile` does not average the P95 values of individual Pods.

### OpenTelemetry Collector

Instrumentation with the OpenTelemetry SDK generates telemetry. The OpenTelemetry Collector ingests it through receivers, processes it through processors, and sends it through exporters. The Collector does not generate business metrics on its own if the application is not instrumented or no metrics source is available.

```text
Application SDK / Envoy spans
       ↓ OTLP
OpenTelemetry Collector
       ↓ processors (batch, memory_limiter, attributes)
Observability backend
```

In production, review cardinality, resource attributes, sampling decisions, trace propagation, and retention. Using `user_id` or `order_id` as Prometheus labels can cause a cardinality explosion. Sensitive data also creates privacy risks.

### Alerting and error budgets

Alert on *symptoms*: SLO burn rate, elevated 5xx rates, and sustained high latency. Do not page someone just because one Pod restarts if the service is still meeting its SLO; file a ticket or send a warning instead. Tune multi-window, multi-burn-rate alerts for low traffic and missing data.

### Lab

1. Instrument Payment with a request duration histogram and an HTTP status counter.
2. Build a Grafana dashboard with RED metrics for Payment and USE metrics for Kubernetes node CPUs.
3. Generate synthetic failing requests in staging and correlate logs, traces, and metrics.
4. Calculate the 30-day SLO and error budget from actual metrics, not made-up numbers.
5. Configure alerts so notifications include a runbook link, the service owner, and the affected environment.

Sources: [Prometheus best practices](https://prometheus.io/docs/practices/), [OTel concepts](https://opentelemetry.io/docs/concepts/), [SRE workbook](https://sre.google/workbook/).

## Self-check questions

1. Which controller owns the desired state and the actual state in this context?
2. What failure modes can occur even when the Kubernetes resource reports `Ready`?
3. What would you verify before deploying to production?
