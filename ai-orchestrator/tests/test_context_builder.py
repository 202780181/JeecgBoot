import asyncio

from app.models.schemas import AiAppConfig, AppChatStreamRequest, ContextFragment, ContextMessage, ContextSource, ModelConfig
from app.services.context_builder import ContextBuilder


def build_messages(request: AppChatStreamRequest, model: ModelConfig, current_input: str | None = None):
    return asyncio.run(
        ContextBuilder().build(
            request,
            model,
            "system prompt",
            current_input or request.input,
        )
    )


def test_context_builder_keeps_required_messages_under_small_budget():
    request = AppChatStreamRequest(
        app=AiAppConfig(id="ai-sdk-dev", model_id="model-1"),
        input="当前输入必须保留",
        context_source=ContextSource(
            recent_messages=[
                ContextMessage(role="user", content="old message " * 2000),
                ContextMessage(role="assistant", content="old reply " * 2000),
            ],
        ),
    )
    model = ModelConfig(
        id="model-1",
        model_name="test-model",
        base_url="https://example.com/v1",
        model_params={
            "contextWindow": 1200,
            "maxOutputTokens": 200,
            "reasoningReserve": 100,
            "safetyMargin": 100,
        },
    )

    messages = build_messages(request, model)

    assert messages[0]["role"] == "system"
    assert messages[-1] == {"role": "user", "content": "当前输入必须保留"}


def test_context_builder_dedupes_fragments_by_url_and_prioritizes_attachments():
    request = AppChatStreamRequest(
        app=AiAppConfig(id="ai-sdk-dev", model_id="model-1"),
        input="总结上下文",
        context_source=ContextSource(
            relevant_fragments=[
                ContextFragment(type="source", text="来源 A", metadata={"url": "https://example.com/a"}, create_time="1"),
                ContextFragment(type="source", text="来源 A duplicate", metadata={"url": "https://example.com/a"}, create_time="2"),
            ],
            attachment_summaries=[
                ContextFragment(type="attachment_summary", text="附件 A", metadata={"url": "https://example.com/file.md"}, create_time="3"),
            ],
        ),
    )
    model = ModelConfig(id="model-1", model_name="test-model", base_url="https://example.com/v1")

    messages = build_messages(request, model)
    context_message = next(message for message in messages if "可用上下文片段" in message["content"])

    assert "来源 A" in context_message["content"]
    assert "来源 A duplicate" not in context_message["content"]
    assert context_message["content"].find("[attachment_summary]") < context_message["content"].find("[source]")


def test_context_builder_excludes_attachment_summaries_when_user_does_not_reference_files():
    request = AppChatStreamRequest(
        app=AiAppConfig(id="ai-sdk-dev", model_id="model-1"),
        input="帮我查一查今天AI有哪些新闻",
        context_source=ContextSource(
            attachment_summaries=[
                ContextFragment(type="attachment_summary", text="用户上传文件：test.txt", metadata={"url": "https://example.com/test.txt"}, create_time="3"),
            ],
        ),
    )
    model = ModelConfig(id="model-1", model_name="test-model", base_url="https://example.com/v1")

    messages = build_messages(request, model)
    joined = "\n".join(message["content"] for message in messages)

    assert "test.txt" not in joined
    assert "attachment_summary" not in joined


def test_context_builder_includes_attachment_summaries_when_user_references_previous_file():
    request = AppChatStreamRequest(
        app=AiAppConfig(id="ai-sdk-dev", model_id="model-1"),
        input="读取之前上传的 test.txt 文件第一行",
        context_source=ContextSource(
            attachment_summaries=[
                ContextFragment(type="attachment_summary", text="用户上传文件：test.txt", metadata={"url": "https://example.com/test.txt"}, create_time="3"),
            ],
        ),
    )
    model = ModelConfig(id="model-1", model_name="test-model", base_url="https://example.com/v1")

    messages = build_messages(request, model)
    joined = "\n".join(message["content"] for message in messages)

    assert "test.txt" in joined
    assert "attachment_summary" in joined


def test_context_builder_truncates_long_fragments_before_old_messages():
    request = AppChatStreamRequest(
        app=AiAppConfig(id="ai-sdk-dev", model_id="model-1"),
        input="当前问题",
        context_source=ContextSource(
            relevant_fragments=[
                ContextFragment(type="tool_result", text="工具结果 " * 5000, create_time="1"),
            ],
            recent_messages=[
                ContextMessage(role="user", content="较老消息 " * 5000),
            ],
        ),
    )
    model = ModelConfig(
        id="model-1",
        model_name="test-model",
        base_url="https://example.com/v1",
        model_params={
            "contextWindow": 2000,
            "maxOutputTokens": 300,
            "reasoningReserve": 200,
            "safetyMargin": 200,
        },
    )

    messages = build_messages(request, model)
    joined = "\n".join(message["content"] for message in messages)

    assert "当前问题" in joined
    assert "内容已按 token budget 截断" in joined
