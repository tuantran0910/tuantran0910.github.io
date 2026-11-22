import Link from 'next/link';

export default function HandbookRedirectPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <meta httpEquiv="refresh" content="0;url=/en/handbook" />
      <p className="text-sm text-fd-muted-foreground">Redirecting to handbook…</p>
      <Link href="/en/handbook" className="text-sm font-medium underline">
        Continue to /en/handbook
      </Link>
    </main>
  );
}
