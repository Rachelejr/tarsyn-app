import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{minHeight:"100vh",background:"#FAF0E6",display:"flex",flexDirection:"column"}}>
      <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 32px",borderBottom:"1px solid #D4AF7A"}}>
        <span style={{fontWeight:800,fontSize:"24px",color:"#6B2D4E"}}>TARSYN</span>
        <div style={{display:"flex",gap:"16px"}}>
          <Link href="/login" style={{padding:"8px 20px",color:"#6B2D4E",border:"1px solid #6B2D4E",borderRadius:"8px",textDecoration:"none"}}>Sign In</Link>
          <Link href="/register" style={{padding:"8px 20px",background:"#6B2D4E",color:"white",borderRadius:"8px",textDecoration:"none"}}>Get Started</Link>
        </div>
      </nav>
      <section style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"80px 24px"}}>
        <h1 style={{fontSize:"48px",fontWeight:800,color:"#6B2D4E",marginBottom:"24px"}}>Your community. Your power.</h1>
        <p style={{fontSize:"20px",color:"#6B2D4E",opacity:0.7,maxWidth:"500px",marginBottom:"40px"}}>TARSYN automates your rotating savings group. No spreadsheets. No missed payments.</p>
        <Link href="/register" style={{padding:"16px 40px",background:"#6B2D4E",color:"white",borderRadius:"12px",fontWeight:700,fontSize:"18px",textDecoration:"none"}}>Create My Group</Link>
      </section>
    </main>
  );
}