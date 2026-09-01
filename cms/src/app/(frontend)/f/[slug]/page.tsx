import { IntakeForm } from "./IntakeForm";

export default async function OrderIntakePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <IntakeForm slug={slug} />;
}
