import LoginForm from "@/components/LoginForm";
import AdminSetupHint from "@/components/AdminSetupHint";
import SiteFooter from "@/components/SiteFooter";

export default function LoginPage() {
  return (
    <main>
      <section style={{ marginBottom: 32 }}>
        <h1>Admin Access</h1>
        <p>Sign in to manage affiliates, moderation, and crypto settings.</p>
      </section>
      <AdminSetupHint />
      <LoginForm />
      <SiteFooter showStartJourney={false} />
    </main>
  );
}
