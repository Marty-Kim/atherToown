import { FeatureRoom } from '@/components/features/FeatureRoom';

export default async function FeatureRoomPage({
  params,
}: {
  params: Promise<{ featureId: string }>;
}) {
  const { featureId } = await params;
  return <FeatureRoom featureId={featureId} />;
}
