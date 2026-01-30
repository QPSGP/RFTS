import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main>
      <section style={{ marginBottom: 32 }}>
        <h1>Admin Access</h1>
        <p>Sign in to manage affiliates, moderation, and crypto settings.</p>
      </section>
      <LoginForm />
    </main>
  );
}
