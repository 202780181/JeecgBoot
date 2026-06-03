import json
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class StreamEventType(StrEnum):
    INIT_REQUEST_ID = "INIT_REQUEST_ID"
    MESSAGE = "MESSAGE"
    TOOL_CALL = "TOOL_CALL"
    TOOL_RESULT = "TOOL_RESULT"
    SKILL_SELECTED = "SKILL_SELECTED"
    SPEC_EVENT = "SPEC_EVENT"
    CONTEXT_SELECTED = "CONTEXT_SELECTED"
    MESSAGE_END = "MESSAGE_END"
    ERROR = "ERROR"


class StreamEvent(BaseModel):
    event: StreamEventType
    request_id: str = Field(serialization_alias="requestId")
    conversation_id: str = Field(default="debug", serialization_alias="conversationId")
    topic_id: str = Field(default="", serialization_alias="topicId")
    data: dict[str, Any] | None = None

    def to_sse(self) -> str:
        payload = self.model_dump(by_alias=True)
        return f"data:{json.dumps(payload, ensure_ascii=False)}\n\n"


def stream_event(
    request_id: str,
    event: StreamEventType,
    data: dict[str, Any] | None = None,
    conversation_id: str = "debug",
    topic_id: str = "",
) -> str:
    return StreamEvent(
        request_id=request_id,
        event=event,
        data=data,
        conversation_id=conversation_id,
        topic_id=topic_id,
    ).to_sse()
