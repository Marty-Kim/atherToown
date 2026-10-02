/** 아주 작은 SSE 헬퍼. 브라우저와 러너 스트림이 같은 코드를 쓴다. */
export function sseStream<T>(
  register: (send: (payload: T) => void) => () => void,
  options: { keepAliveMs?: number } = {},
): Response {
  const encoder = new TextEncoder();
  const keepAliveMs = options.keepAliveMs ?? 15_000;

  let detach: (() => void) | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      write(': connected\n\n');
      detach = register((payload) => write(`data: ${JSON.stringify(payload)}\n\n`));
      timer = setInterval(() => write(': ping\n\n'), keepAliveMs);
    },
    cancel() {
      detach?.();
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
