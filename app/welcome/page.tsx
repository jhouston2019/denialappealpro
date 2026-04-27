import { WelcomeClient } from "./welcome-client";

type Props = { searchParams: Promise<{ session_id?: string; email?: string }> };

export default async function WelcomePage(props: Props) {
  const sp = await props.searchParams;
  return <WelcomeClient sessionId={sp.session_id} initialEmail={sp.email} />;
}
