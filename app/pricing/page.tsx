import Link from "next/link";

export default function PricingPlaceholder() {
  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
      <h1>Pricing</h1>
      <p>Full pricing UI is migrated in a later phase. Use the pricing API + checkout session from the client.</p>
      <p>
        <Link href="/welcome">Welcome (after checkout)</Link>
      </p>
    </div>
  );
}
