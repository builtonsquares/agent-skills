from dataclasses import dataclass


@dataclass(frozen=True)
class Job:
    tenant_id: str
    recipient: str
    subject: str
    body: str
