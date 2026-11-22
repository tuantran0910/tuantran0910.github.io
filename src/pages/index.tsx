import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';

export default function Portfolio() {
  return (
    <Layout title="Portfolio" description="Tuan Tran’s work, projects, and learning notes.">
      <main className="container margin-vert--lg">
        <header className="hero-home">
          <h1>Tuan Tran</h1>
          <p>A home for my projects and what I’m learning about cloud-native and platform engineering.</p>
          <Link className="button button--primary button--lg" to="#work">Explore my work</Link>
        </header>

        <section aria-labelledby="work">
          <Heading as="h2" id="work">Work</Heading>
          <div className="card-grid">
            <Link className="topic-card" href="https://github.com/tuantran0910?tab=repositories">
              <h3>Projects on GitHub</h3>
              <p>Browse my public repositories and contributions.</p>
            </Link>
          </div>
        </section>

        <section aria-labelledby="learning">
          <Heading as="h2" id="learning">Learning</Heading>
          <div className="card-grid">
            <Link className="topic-card" to="/handbook/">
              <h3>Cloud Native Engineering Handbook</h3>
              <p>19 lessons on Kubernetes, GitOps, networking, reliability, and platform engineering.</p>
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
