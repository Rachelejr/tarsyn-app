import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#FAF0E6] flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5">
        <span className="font-bold text-2xl text-[#6B2D4E]">TARSYN</span>
        <div className="flex gap-4">
          <Link href="/login" className="px-5 py-2 text-[#6B2D4E]">Sign In</Link>
          <Link href="/register" className="px-5 py-2 bg-[#6B2D4E] text-white rounded-lg">Get Started</Link>
        </div>
      </nav>
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-8">
        <h1 className="text-5xl font-extrabold text-[#6B2D4E]">Your community. Your power.</h1>
        <p className="text-xl text-[#6B2D4E]/70 max-w-xl">TARSYN automates your rotating savings group.</p>
        <Link href="/register" className="px-8 py-3 bg-[#6B2D4E] text-white rounded-xl font-semibold">Create My Group</Link>
      </section>
    </main>
  );
}
