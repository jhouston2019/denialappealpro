import type { ReactNode } from "react";
import { AppealProvider } from "@/context/appeal-context";

export default function StartLayout({ children }: { children: ReactNode }) {
  return <AppealProvider>{children}</AppealProvider>;
}
