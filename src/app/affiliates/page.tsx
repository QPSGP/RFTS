import AffiliateAdmin from "@/components/AffiliateAdmin";
import AffiliateForm from "@/components/AffiliateForm";

export default function AffiliatesPage() {
  return (
    <main>
      <section style={{ marginBottom: 32 }}>
        <h1>Affiliate Program</h1>
        <p>
          Grow Reach For The Stars with a secure, blockchain-ready affiliate
          pipeline. Apply below or manage approvals in the admin panel.
        </p>
      </section>
      <section className="grid grid-2">
        <AffiliateForm />
        <AffiliateAdmin />
      </section>
    </main>
  );
}
