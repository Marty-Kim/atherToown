import Link from 'next/link';
import { PageContainer } from '@/components/shell/PageContainer';
import { EmptyState } from '@/components/ui/states';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <PageContainer>
      <EmptyState
        icon={<span aria-hidden>404</span>}
        title="페이지를 찾을 수 없습니다"
        description="주소가 잘못되었거나 삭제된 화면입니다."
        action={
          <Button variant="primary" size="sm" asChild>
            <Link href="/">Overview로 이동</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
