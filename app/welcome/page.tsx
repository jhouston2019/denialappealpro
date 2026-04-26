import { WelcomeClient } from "./welcome-client";

type Props = { searchParams: Promise<{ session_id?: string }> };

export default async function WelcomePage(props: Props) {
  const sp = await props.searchParams;
  const sessionId = sp.session_id;
  return <WelcomeClient sessionId={sessionId} />;
}
