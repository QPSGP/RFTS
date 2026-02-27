/** No server-side gate: let the page load so the client can fetch /api/user/me with the cookie. */
export default function PlayOptionsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
