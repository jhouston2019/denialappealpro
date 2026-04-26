import { redirect } from "next/navigation";

/** Default (app) entry — align with CRA /app router in Phase E */
export default function AppHomePage() {
  redirect("/start");
}
