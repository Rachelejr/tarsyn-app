port default function HomePage() {
>>   return (
>>     <main className="min-h-screen bg-[#FAF0E6] flex flex-col">
>>       <nav className="flex items-center justify-between px-8 py-5 border-b border-[#D4AF7A]/30">
>>         <span className="font-bold text-2xl text-[#6B2D4E] tracking-tight">TARSYN</span>
>>         <div className="flex gap-4">
>>           <Link href="/login" className="px-5 py-2 rounded-lg text-[#6B2D4E] font-medium border border-[#6B2D4E]/40 hover:bg-[#6B2D4E]/5 transition">
>>             Connexion
>>           </Link>
>>           <Link href="/register" className="px-5 py-2 rounded-lg bg-[#6B2D4E] text-white font-medium hover:bg-[#5a2540] transition">
>>             Commencer
>>           </Link>
>>         </div>
>>       </nav>
>> 
>>       <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-8">
>>         <div className="w-16 h-1 rounded-full bg-[#D4AF7A] mb-2" />
>>         <h1 className="text-5xl md:text-6xl font-extrabold text-[#6B2D4E] leading-tight max-w-3xl">
>>           La tontine,{" "}
>>           <span className="text-[#D4AF7A]">réinventée</span>
>>         </h1>
>>         <p className="text-lg md:text-xl text-[#6B2D4E]/70 max-w-xl leading-relaxed">
>>           TARSYN automatise la collecte, la rotation et les rappels de votre groupe d'épargne rotatif — zéro tableur, zéro oubli.
>>         </p>
>>         <div className="flex flex-col sm:flex-row gap-4 mt-4">
>>           <Link href="/register" className="px-8 py-3 rounded-xl bg-[#6B2D4E] text-white font-semibold text-lg hover:bg-[#5a2540] transition shadow-lg shadow-[#6B2D4E]/20">
>>             Créer mon groupe →
>>           </Link>
>>           <Link href="/login" className="px-8 py-3 rounded-xl border-2 border-[#D4AF7A] text-[#6B2D4E] font-semibold text-lg hover:bg-[#D4AF7A]/10 transition">
>>             Me connecter
>>           </Link>
>>         </div>
>>         <p className="text-sm text-[#6B2D4E]/40 mt-8">
>>           Déjà utilisé par des groupes au Cameroun, en France et au Canada.
>>         </p>
>>       </section>
>> 
>>       <footer className="text-center py-6 text-sm text-[#6B2D4E]/40 border-t border-[#D4AF7A]/20">
>>         © {new Date().getFullYear()} TARSYN — Épargne collective simplifiée
>>       </footer>
>>     </main>
>>   );
>> }