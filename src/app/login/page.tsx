import LoginForm from "@/components/LoginForm";
import AdminSetupHint from "@/components/AdminSetupHint";
import SiteFooter from "@/components/SiteFooter";

export default function LoginPage() {
  return (
    <main>
      <section style={{ marginBottom: 32 }}>
        <h1>Admin / Facilitator Login</h1>
        <p>
          Admins manage members, billing, and facilitator approvals. Facilitators sign in here
          with the access code set when their application was approved.
        </p>
      </section>
      <AdminSetupHint />
      <LoginForm />
      <SiteFooter showStartJourney={false} />
    </main>
  );
}
