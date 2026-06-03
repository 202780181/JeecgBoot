import asyncio

from app.models.schemas import (
    AiAppConfig,
    ContextCompactionRequest,
    ContextMessage,
    ContextCompactionSource,
    ModelConfig,
    ModelCredential,
    UserContext,
)
from app.services.context_compactor import ContextCompactor


def test_context_compaction_request_accepts_java_camel_case_payload():
    request = ContextCompactionRequest.model_validate(
        {
            "app": {"id": "ai-sdk-dev", "model_id": "model-1"},
            "conversation_id": "conversation-1",
            "context_source": {
                "previous_summary": {
                    "text": "{}",
                    "messageId": "message-0",
                    "tokenCount": 10,
                },
                "messages": [
                    {
                        "id": "message-1",
                        "role": "user",
                        "content": "继续实现上下文压缩",
                        "tokenCount": 20,
                        "createTime": "2026-06-03 10:00:00",
                    }
                ],
                "fragments": [
                    {
                        "id": "fragment-1",
                        "conversationId": "conversation-1",
                        "messageId": "message-1",
                        "type": "skill_result",
                        "text": "Skill 执行完成",
                        "tokenCount": 15,
                        "createTime": "2026-06-03 10:01:00",
                    }
                ],
            },
            "user_context": {},
        }
    )

    assert request.context_source.previous_summary.message_id == "message-0"
    assert request.context_source.messages[0].token_count == 20
    assert request.context_source.fragments[0].message_id == "message-1"


def test_context_compactor_parses_json_inside_model_text():
    compactor = ContextCompactor()
    summary = compactor._parse_summary(
        '```json\n{"objective":"开发上下文管理","userPreferences":["按步骤开发"],"projectConstraints":[],"importantDecisions":[],"completedWork":["Step 6 已完成"],"currentState":"正在执行 Step 7","openIssues":[],"importantFiles":[],"toolResults":[],"nextSteps":["验证摘要压缩"]}\n```'
    )

    assert summary.objective == "开发上下文管理"
    assert summary.completedWork == ["Step 6 已完成"]


def test_context_compactor_normalizes_object_fields_returned_by_model():
    compactor = ContextCompactor()
    summary = compactor._parse_summary(
        '{"objective":"继续协助开发","userPreferences":{"language":"中文","responseStyle":"直接"},"projectConstraints":{"assistantRole":"JeecgBoot AI 助手"},"importantDecisions":[],"completedWork":[],"currentState":{"phase":"Step 7 验证"},"openIssues":[],"importantFiles":[],"toolResults":[],"nextSteps":{"verify":"重新触发压缩"}}'
    )

    assert summary.userPreferences == ["language: 中文", "responseStyle: 直接"]
    assert summary.projectConstraints == ["assistantRole: JeecgBoot AI 助手"]
    assert summary.currentState == '{"phase": "Step 7 验证"}'
    assert summary.nextSteps == ["verify: 重新触发压缩"]


def test_context_compactor_builds_response_from_real_model_call(monkeypatch):
    class FakeJeecgClient:
        async def get_model_config(self, model_id, user_context):
            return ModelConfig(
                id=model_id,
                model_name="test-model",
                base_url="https://example.com/v1",
                credential=ModelCredential(api_key="test-key"),
            )

    async def fake_complete_json(model, prompt):
        assert "继续开发 Step 7" in prompt
        return compactor._parse_summary(
            '{"objective":"上下文管理","userPreferences":[],"projectConstraints":[],"importantDecisions":[],"completedWork":[],"currentState":"Step 7 开发中","openIssues":[],"importantFiles":[],"toolResults":[],"nextSteps":[]}'
        )

    compactor = ContextCompactor(jeecg_client=FakeJeecgClient())
    monkeypatch.setattr(compactor, "_complete_json", fake_complete_json)
    request = ContextCompactionRequest(
        app=AiAppConfig(id="ai-sdk-dev", model_id="model-1"),
        conversation_id="conversation-1",
        context_source=ContextCompactionSource(
            messages=[
                ContextMessage(
                    id="message-1",
                    role="user",
                    content="继续开发 Step 7",
                )
            ]
        ),
        user_context=UserContext(),
    )

    response = asyncio.run(compactor.compact(request))

    assert response.summary_message_id == "message-1"
    assert '"objective": "上下文管理"' in response.summary_text
    assert '"snapshotType": "active_context_snapshot"' in response.active_context_snapshot
    assert response.active_context_token_count > 0
    assert response.token_ledger["summaryMessageId"] == "message-1"
    assert response.token_ledger["compactedMessageCount"] == 1
    assert response.metadata["messageCount"] == 1
    assert response.metadata["activeContextSnapshotVersion"] == 1
