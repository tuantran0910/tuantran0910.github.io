import Link from 'next/link';
import {ArrowRight, BookOpen, Compass, FolderGit2, Layers} from 'lucide-react';

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16 md:py-24">
      <section className="relative overflow-hidden rounded-2xl border border-fd-border bg-gradient-to-br from-fd-card via-fd-card to-fd-primary/10 p-8 md:p-12">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-fd-primary/30 bg-fd-primary/10 px-3 py-1 text-xs font-semibold tracking-wider text-fd-primary uppercase">
          Cloud-Native &amp; Platform Engineering
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-fd-foreground md:text-5xl">
          Tuan Tran
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-fd-muted-foreground md:text-lg">
          A home for my projects and what I&apos;m learning about Kubernetes internals, GitOps,
          networking, observability, reliability, and production platform engineering.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/handbook"
            className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
          >
            Read the Handbook
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="#work"
            className="inline-flex items-center gap-2 rounded-lg border border-fd-border bg-fd-background px-5 py-2.5 text-sm font-medium text-fd-foreground transition-colors hover:bg-fd-accent"
          >
            Explore my work
          </Link>
        </div>
      </section>

      <section id="work" className="scroll-mt-24 space-y-5">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-fd-foreground">Work</h2>
          <p className="text-sm text-fd-muted-foreground">
            Open-source repositories, infrastructure experiments, and platform tooling.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href="https://github.com/tuantran0910?tab=repositories"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col justify-between rounded-xl border border-fd-border bg-fd-card p-6 transition-colors hover:border-fd-primary/50 hover:bg-fd-accent/40"
          >
            <div>
              <FolderGit2 className="mb-3 size-5 text-fd-primary" />
              <h3 className="text-base font-semibold text-fd-foreground">Projects on GitHub</h3>
              <p className="mt-2 text-sm text-fd-muted-foreground">
                Browse my public repositories, Kubernetes labs, and engineering contributions.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-fd-primary">
              github.com/tuantran0910 <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </a>
        </div>
      </section>

      <section id="learning" className="scroll-mt-24 space-y-5">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-fd-foreground">Learning</h2>
          <p className="text-sm text-fd-muted-foreground">
            Structured deep dives, architecture walkthroughs, hands-on labs, and interactive exercises.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/handbook"
            className="group flex flex-col justify-between rounded-xl border border-fd-border bg-fd-card p-6 transition-colors hover:border-fd-primary/50 hover:bg-fd-accent/40"
          >
            <div>
              <BookOpen className="mb-3 size-5 text-fd-primary" />
              <h3 className="text-base font-semibold text-fd-foreground">
                Cloud Native Engineering Handbook
              </h3>
              <p className="mt-2 text-sm text-fd-muted-foreground">
                19 lessons, hands-on labs, and interactive exercises covering Kubernetes, Argo CD, GKE, Istio, and SRE.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-fd-primary">
              Open handbook <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          <Link
            href="/handbook/learning-path"
            className="group flex flex-col justify-between rounded-xl border border-fd-border bg-fd-card p-6 transition-colors hover:border-fd-primary/50 hover:bg-fd-accent/40"
          >
            <div>
              <Compass className="mb-3 size-5 text-fd-primary" />
              <h3 className="text-base font-semibold text-fd-foreground">Learning Path</h3>
              <p className="mt-2 text-sm text-fd-muted-foreground">
                Follow the 19-lesson curriculum in order from SSA and controllers to security and multi-tenancy.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-fd-primary">
              Start learning <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          <Link
            href="/handbook/topics"
            className="group flex flex-col justify-between rounded-xl border border-fd-border bg-fd-card p-6 transition-colors hover:border-fd-primary/50 hover:bg-fd-accent/40"
          >
            <div>
              <Layers className="mb-3 size-5 text-fd-primary" />
              <h3 className="text-base font-semibold text-fd-foreground">Topic Library</h3>
              <p className="mt-2 text-sm text-fd-muted-foreground">
                Jump directly into GitOps, controllers, networking, observability, storage, or reliability.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-fd-primary">
              Browse topics <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
