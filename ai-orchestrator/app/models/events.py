import json
from enum import StrEnum
import time
from typing import Any

from pydantic import BaseModel, Field

SSE_EVENT_VERSION = "2026-06-04"


class StreamEventType(StrEnum):
    RUN_STARTED = "RUN_STARTED"
    MESSAGE = "MESSAGE"
    TOOL_CALL = "TOOL_CALL"
    TOOL_RESULT = "TOOL_RESULT"
    SKILL_SELECTED = "SKILL_SELECTED"
    SPEC_EVENT = "SPEC_EVENT"
    CONTEXT_SELECTED = "CONTEXT_SELECTED"
    PREFLIGHT = "PREFLIGHT"
    MESSAGE_END = "MESSAGE_END"
    CANCELLED = "CANCELLED"
    ERROR = "ERROR"


class StreamEvent(BaseModel):
    version: str = SSE_EVENT_VERSION
    run_id: str = Field(serialization_alias="runId")
    sequence: int
    event: StreamEventType
    phase: str = ""
    status: str = ""
    timestamp: int = 0
    message_id: str | None = Field(default=None, serialization_alias="messageId")
    conversation_id: str = Field(default="debug", serialization_alias="conversationId")
    topic_id: str = Field(default="", serialization_alias="topicId")
    data: dict[str, Any] | None = None

    def to_sse(self) -> str:
        payload = self.model_dump(by_alias=True)
        return f"data:{json.dumps(payload, ensure_ascii=False)}\n\n"


def stream_event(
    run_id: str,
    sequence: int,
    event: StreamEventType,
    data: dict[str, Any] | None = None,
    conversation_id: str = "debug",
    topic_id: str = "",
    message_id: str | None = None,
    phase: str | None = None,
    status: str | None = None,
) -> str:
    return StreamEvent(
        run_id=run_id,
        sequence=sequence,
        event=event,
        phase=phase or default_phase(event),
        status=status or default_status(event),
        timestamp=int(time.time() * 1000),
        message_id=message_id,
        data=data,
        conversation_id=conversation_id,
        topic_id=topic_id,
    ).to_sse()


class StreamEventWriter:
    def __init__(
        self,
        *,
        run_id: str,
        conversation_id: str,
        topic_id: str = "",
        message_id: str | None = None,
    ) -> None:
        self.run_id = run_id
        self.conversation_id = conversation_id
        self.topic_id = topic_id
        self.message_id = message_id
        self.sequence = 0

    def event(
        self,
        event: StreamEventType,
        data: dict[str, Any] | None = None,
        *,
        phase: str | None = None,
        status: str | None = None,
    ) -> str:
        self.sequence += 1
        return stream_event(
            self.run_id,
            self.sequence,
            event,
            data,
            self.conversation_id,
            self.topic_id,
            self.message_id,
            phase,
            status,
        )


def default_phase(event: StreamEventType) -> str:
    mapping = {
        StreamEventType.RUN_STARTED: "init",
        StreamEventType.PREFLIGHT: "preflight",
        StreamEventType.CONTEXT_SELECTED: "context",
        StreamEventType.SKILL_SELECTED: "skill",
        StreamEventType.SPEC_EVENT: "skill",
        StreamEventType.TOOL_CALL: "execute",
        StreamEventType.TOOL_RESULT: "execute",
        StreamEventType.MESSAGE: "message",
        StreamEventType.MESSAGE_END: "finalize",
        StreamEventType.CANCELLED: "finalize",
        StreamEventType.ERROR: "error",
    }
    return mapping.get(event, "stream")


def default_status(event: StreamEventType) -> str:
    mapping = {
        StreamEventType.RUN_STARTED: "started",
        StreamEventType.TOOL_CALL: "running",
        StreamEventType.MESSAGE_END: "completed",
        StreamEventType.CANCELLED: "cancelled",
        StreamEventType.ERROR: "failed",
    }
    return mapping.get(event, "completed")
