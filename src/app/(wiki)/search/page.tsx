import { Suspense } from "react";
import SearchClient from "./SearchClient";

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchClient />
    </Suspense>
  );
}

function SearchFallback() {
  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold">Search</h1>
      <div className="mb-4 h-10 animate-pulse rounded-md bg-muted" />
      <div className="mb-6 flex gap-2">
        <div className="h-6 w-12 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-14 animate-pulse rounded-full bg-muted" />
      </div>
    </main>
  );
}
