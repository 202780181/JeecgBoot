import asyncio

from app.models.schemas import AiAppConfig, AppChatStreamRequest, ContextFragment, ContextMessage, ContextSource, ContextSummary, ModelConfig
from app.services.context_builder import ContextBuilder


def chat_request(**kwargs) -> AppChatStreamRequest:
    kwargs.setdefault("runId", "run_test")
    return AppChatStreamRequest(**kwargs)


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
    request = chat_request(
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


def test_context_builder_defaults_to_safe_large_context_window():
    builder = ContextBuilder()
    model = ModelConfig(id="model-1", model_name="test-model", base_url="https://example.com/v1")

    budget = builder._token_budget(model)

    assert budget.context_window == 800000
    assert budget.input_budget == 791808


def test_context_builder_uses_active_context_snapshot_as_summary_context():
    request = chat_request(
        app=AiAppConfig(id="ai-sdk-dev", model_id="model-1"),
        input="继续做下一步",
        context_source=ContextSource(
            summary=ContextSummary(
                text='{"snapshotType":"active_context_snapshot","summary":{"objective":"上下文管理"}}',
                contextVersion=3,
                tokenCount=20,
                metadata={"contextMode": "active_snapshot"},
            ),
        ),
    )
    model = ModelConfig(id="model-1", model_name="test-model", base_url="https://example.com/v1")

    messages = build_messages(request, model)
    joined = "\n".join(message["content"] for message in messages)

    assert "活跃上下文快照（context_version=3）" in joined
    assert "active_context_snapshot" in joined


def test_context_builder_puts_active_task_snapshot_before_summary_and_fragments():
    request = chat_request(
        app=AiAppConfig(id="ai-sdk-dev", model_id="model-1"),
        input="继续修改点单页面",
        context_source=ContextSource(
            summary=ContextSummary(text="旧的会话摘要", contextVersion=4),
            active_task_snapshots=[
                ContextFragment(
                    type="active_task_snapshot",
                    text="当前任务状态快照：当前工作区=lululai-luwei-regenerate-c85937bf\n相关文件=src/pages/order/order.vue",
                    metadata={"workspaceId": "lululai-luwei-regenerate-c85937bf"},
                    create_time="3",
                ),
            ],
            relevant_fragments=[
                ContextFragment(
                    type="active_task_snapshot",
                    text="重复的当前任务状态快照",
                    metadata={"workspaceId": "lululai-luwei-regenerate-c85937bf"},
                    create_time="2",
                ),
                ContextFragment(type="file_change", text="普通文件变更片段", create_time="1"),
            ],
        ),
    )
    model = ModelConfig(id="model-1", model_name="test-model", base_url="https://example.com/v1")

    messages = build_messages(request, model)
    contents = [message["content"] for message in messages]
    joined = "\n".join(contents)

    task_index = next(i for i, content in enumerate(contents) if "当前任务状态（必须优先遵循）" in content)
    summary_index = next(i for i, content in enumerate(contents) if "会话摘要" in content)
    fragment_index = next(i for i, content in enumerate(contents) if "可用上下文片段" in content)

    assert task_index < summary_index < fragment_index
    assert "lululai-luwei-regenerate-c85937bf" in contents[task_index]
    assert "普通文件变更片段" in joined
    assert "重复的当前任务状态快照" not in joined


def test_context_builder_dedupes_fragments_by_url():
    request = chat_request(
        app=AiAppConfig(id="ai-sdk-dev", model_id="model-1"),
        input="总结上下文",
        context_source=ContextSource(
            relevant_fragments=[
                ContextFragment(type="source", text="来源 A", metadata={"url": "https://example.com/a"}, create_time="1"),
                ContextFragment(type="source", text="来源 A duplicate", metadata={"url": "https://example.com/a"}, create_time="2"),
            ]
        ),
    )
    model = ModelConfig(id="model-1", model_name="test-model", base_url="https://example.com/v1")

    messages = build_messages(request, model)
    context_message = next(message for message in messages if "可用上下文片段" in message["content"])

    assert "来源 A" in context_message["content"]
    assert "来源 A duplicate" not in context_message["content"]


def test_context_builder_reranks_source_when_user_mentions_sources():
    request = chat_request(
        app=AiAppConfig(id="ai-sdk-dev", model_id="model-1"),
        input="用刚才联网搜索的来源继续总结",
        context_source=ContextSource(
            relevant_fragments=[
                ContextFragment(type="tool_result", text="天气工具结果", metadata={"score": 0.2}, create_time="1"),
                ContextFragment(type="source", text="联网搜索来源：JeecgBoot 官网", metadata={"url": "https://jeecg.com", "score": 0.2}, create_time="2"),
            ]
        ),
    )
    model = ModelConfig(id="model-1", model_name="test-model", base_url="https://example.com/v1")

    messages = build_messages(request, model)
    context_message = next(message for message in messages if "可用上下文片段" in message["content"])

    assert context_message["content"].find("[source]") < context_message["content"].find("[tool_result]")


def test_context_builder_includes_relevant_messages_before_recent_messages():
    request = chat_request(
        app=AiAppConfig(id="ai-sdk-dev", model_id="model-1"),
        input="继续之前那个部署问题",
        context_source=ContextSource(
            relevant_messages=[
                ContextMessage(id="message-1", role="user", content="之前讨论过部署新系统需要先配置 nginx"),
            ],
            recent_messages=[
                ContextMessage(id="message-2", role="assistant", content="最近回复"),
            ],
        ),
    )
    model = ModelConfig(id="model-1", model_name="test-model", base_url="https://example.com/v1")

    messages = build_messages(request, model)
    contents = [message["content"] for message in messages]

    assert "之前讨论过部署新系统需要先配置 nginx" in contents
    assert "最近回复" in contents
    assert contents.index("之前讨论过部署新系统需要先配置 nginx") < contents.index("最近回复")


def test_context_builder_excludes_attachment_summaries_when_user_does_not_reference_files():
    request = chat_request(
        app=AiAppConfig(id="ai-sdk-dev", model_id="model-1"),
        input="帮我查一查今天AI有哪些新闻",
        context_source=ContextSource(
            attachment_summaries=[
                ContextFragment(type="attachment_summary", text="用户上传文件：test.txt", metadata={"url": "https://example.com/test.txt"}, create_time="3"),
            ],
            attachment_candidates=[
                ContextFragment(type="attachment_summary", text="用户上传文件：test.txt", metadata={"url": "https://example.com/test.txt", "name": "test.txt"}, create_time="3"),
            ],
        ),
    )
    model = ModelConfig(id="model-1", model_name="test-model", base_url="https://example.com/v1")

    messages = build_messages(request, model)
    joined = "\n".join(message["content"] for message in messages)

    assert "test.txt" not in joined
    assert "attachment_summary" not in joined


def test_context_builder_includes_attachment_summaries_when_user_references_previous_file():
    request = chat_request(
        app=AiAppConfig(id="ai-sdk-dev", model_id="model-1"),
        input="读取之前上传的 test.txt 文件第一行",
        context_source=ContextSource(
            attachment_summaries=[
                ContextFragment(type="attachment_summary", text="用户上传文件：test.txt", metadata={"url": "https://example.com/test.txt"}, create_time="3"),
            ],
            attachment_candidates=[
                ContextFragment(type="attachment_summary", text="用户上传文件：test.txt", metadata={"url": "https://example.com/test.txt", "name": "test.txt"}, create_time="3"),
            ],
        ),
    )
    model = ModelConfig(id="model-1", model_name="test-model", base_url="https://example.com/v1")

    messages = build_messages(request, model)
    joined = "\n".join(message["content"] for message in messages)

    assert "test.txt" in joined
    assert "attachment_summary" in joined


def test_context_builder_includes_high_similarity_attachment_match():
    request = chat_request(
        app=AiAppConfig(id="ai-sdk-dev", model_id="model-1"),
        input="这个部署流程怎么继续",
        context_source=ContextSource(
            attachment_candidates=[
                ContextFragment(type="attachment_summary", text="用户上传文件：deploy.md", metadata={"name": "deploy.md"}, create_time="3"),
            ],
            attachment_matches=[
                ContextFragment(type="attachment_summary", text="用户上传文件：deploy.md\n附件摘要：部署新系统流程", metadata={"name": "deploy.md", "score": 0.9}, create_time="3"),
            ],
        ),
    )
    model = ModelConfig(id="model-1", model_name="test-model", base_url="https://example.com/v1")

    messages = build_messages(request, model)
    joined = "\n".join(message["content"] for message in messages)

    assert "deploy.md" in joined
    assert "部署新系统流程" in joined


def test_context_builder_truncates_long_fragments_before_old_messages():
    request = chat_request(
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
