"""
通用异步重试执行器
指数退避：5s → 10s → 20s
"""
import asyncio
from typing import Callable, Tuple, Type


class RetryExhausted(Exception):
    """重试次数耗尽后抛出"""
    def __init__(self, attempts: int, last_error: Exception):
        self.attempts   = attempts
        self.last_error = last_error
        super().__init__(f"重试 {attempts} 次后仍失败: {last_error}")


async def retry_async(
    func: Callable,
    *args,
    max_attempts: int = 3,
    base_delay:   float = 5.0,
    backoff:      float = 2.0,
    retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,),
    on_retry: Callable = None,
    **kwargs,
):
    """
    异步重试执行器。

    等待序列（默认）：首次重试 5 s → 10 s → 20 s …
    on_retry(attempt, error, delay) 在每次等待前被调用（可以是 async callable）。
    """
    last_error: Exception | None = None
    for attempt in range(max_attempts):
        try:
            return await func(*args, **kwargs)
        except retryable_exceptions as e:
            last_error = e
            if attempt == max_attempts - 1:
                break
            delay = base_delay * (backoff ** attempt)
            if on_retry:
                result = on_retry(attempt + 1, e, delay)
                if asyncio.iscoroutine(result):
                    await result
            await asyncio.sleep(delay)

    raise RetryExhausted(max_attempts, last_error)
