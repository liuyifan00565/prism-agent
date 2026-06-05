from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict
from datetime import datetime
import uuid


@dataclass
class PublishRecord:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    original_title: str = ""
    original_body: str = ""

    # 各平台结果
    # {"xiaohongshu": {"status": "success", "adapted_title": "...",
    #                  "adapted_body": "...", "tags": [], "error": None}}
    platform_results: Dict[str, dict] = field(default_factory=dict)

    # 汇总
    total_platforms: int = 0
    success_count: int = 0
    failed_count: int = 0
    blocked_count: int = 0

    def to_dict(self):
        return asdict(self)
