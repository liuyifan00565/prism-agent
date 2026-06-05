from abc import ABC, abstractmethod
from typing import Optional, List, Union
from agent.state import ComplianceIssue


class BaseRule(ABC):
    rule_name: str
    platform: str

    @abstractmethod
    def check(
        self, full_content: str, title: str, body: str
    ) -> Optional[Union[ComplianceIssue, List[ComplianceIssue]]]:
        pass
