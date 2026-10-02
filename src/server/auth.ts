import { hub, type RunnerRecord } from './hub';

/** Authorization: Bearer <sessionToken> + x-runner-id 헤더로 러너를 식별한다. */
export function authenticateRunner(request: Request): RunnerRecord | null {
  const runnerId = request.headers.get('x-runner-id');
  const auth = request.headers.get('authorization');
  if (!runnerId || !auth?.startsWith('Bearer ')) return null;
  return hub.authenticate(runnerId, auth.slice('Bearer '.length));
}
