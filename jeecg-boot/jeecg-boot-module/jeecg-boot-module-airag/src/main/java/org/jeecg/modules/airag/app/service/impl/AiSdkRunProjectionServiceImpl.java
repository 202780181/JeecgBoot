package org.jeecg.modules.airag.app.service.impl;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.jeecg.common.exception.JeecgBootException;
import org.jeecg.common.util.UUIDGenerator;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.airag.app.entity.AiSdkContextFragment;
import org.jeecg.modules.airag.app.entity.AiSdkMessage;
import org.jeecg.modules.airag.app.entity.AiSdkRun;
import org.jeecg.modules.airag.app.entity.AiSdkRunEvent;
import org.jeecg.modules.airag.app.mapper.AiSdkContextFragmentMapper;
import org.jeecg.modules.airag.app.mapper.AiSdkRunEventMapper;
import org.jeecg.modules.airag.app.service.IAiSdkConversationService;
import org.jeecg.modules.airag.app.service.IAiSdkRunProjectionService;
import org.jeecg.modules.airag.app.service.IAiSdkRunService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * AI SDK Run 投影服务实现
 */
@Slf4j
@Service
public class AiSdkRunProjectionServiceImpl implements IAiSdkRunProjectionService {

    @Autowired
    private IAiSdkRunService aiSdkRunService;

    @Autowired
    private IAiSdkConversationService aiSdkConversationService;

    @Autowired
    private AiSdkRunEventMapper aiSdkRunEventMapper;

    @Autowired
    private AiSdkContextFragmentMapper aiSdkContextFragmentMapper;

    @Override
    public AiSdkMessage projectRun(String runId) {
        AiSdkRun run = aiSdkRunService.getById(runId);
        if (run == null) {
            throw new JeecgBootException("AI SDK Run 不存在：" + runId);
        }
        List<AiSdkRunEvent> events = listRunEvents(runId);
        Projection projection = buildProjection(run, events);
        AiSdkMessage assistantMessage = aiSdkConversationService.saveAssistantMessageProjection(
                run.getAssistantMessageId(),
                run.getConversationId(),
                projection.content.toString(),
                projection.messageStatus(),
                projection.modelId,
                projection.metadata
        );
        if (assistantMessage == null) {
            return null;
        }
        rewriteFragments(assistantMessage, projection.fragments);
        updateRunStatus(runId, projection, assistantMessage.getId());
        return assistantMessage;
    }

    private List<AiSdkRunEvent> listRunEvents(String runId) {
        LambdaQueryWrapper<AiSdkRunEvent> query = new LambdaQueryWrapper<>();
        query.eq(AiSdkRunEvent::getRunId, runId);
        query.orderByAsc(AiSdkRunEvent::getSequence);
        return aiSdkRunEventMapper.selectList(query);
    }

    private Projection buildProjection(AiSdkRun run, List<AiSdkRunEvent> events) {
        Projection projection = new Projection(run);
        for (AiSdkRunEvent event : events) {
            JSONObject payload = parsePayload(event);
            JSONObject data = payload.getJSONObject("data");
            String eventType = oConvertUtils.getString(event.getEventType(), payload.getString("event"));
            if ("MESSAGE".equals(eventType)) {
                projection.content.append(oConvertUtils.getString(data == null ? null : data.getString("message")));
                continue;
            }
            if ("PREFLIGHT".equals(eventType)) {
                projection.metadata.put("preflight", withEnvelope(event, payload, data));
                projection.capturePreflight(data);
                projection.fragments.add(fragment(run, event, "preflight", buildPreflightText(data), data));
                continue;
            }
            if ("TOOL_CALL".equals(eventType)) {
                projection.toolCalls.add(withEnvelope(event, payload, data));
                continue;
            }
            if ("TOOL_RESULT".equals(eventType)) {
                handleToolResult(projection, run, event, payload, data);
                continue;
            }
            if ("SKILL_SELECTED".equals(eventType) || "SPEC_EVENT".equals(eventType)) {
                JSONObject skillEvent = withEnvelope(event, payload, data);
                projection.skillEvents.add(skillEvent);
                projection.fragments.add(fragment(run, event, "skill_result", buildSkillText(eventType, data), skillEvent));
                continue;
            }
            if ("CONTEXT_SELECTED".equals(eventType)) {
                JSONObject contextEvent = withEnvelope(event, payload, data);
                projection.contextEvents.add(contextEvent);
                projection.fragments.add(fragment(run, event, "context_selection", buildContextText(data), contextEvent));
                continue;
            }
            if ("ERROR".equals(eventType)) {
                projection.failed = true;
                projection.errorMessage = oConvertUtils.getString(data == null ? null : data.getString("message"));
                if (projection.content.length() == 0 && oConvertUtils.isNotEmpty(projection.errorMessage)) {
                    projection.content.append(projection.errorMessage);
                }
                projection.errors.add(withEnvelope(event, payload, data));
                projection.fragments.add(fragment(run, event, "error", "执行错误：" + projection.errorMessage, data));
                continue;
            }
            if ("CANCELLED".equals(eventType)) {
                projection.cancelled = true;
                String cancelMessage = oConvertUtils.getString(data == null ? null : data.getString("message"), "响应已停止");
                if (projection.content.length() == 0) {
                    projection.content.append(cancelMessage);
                }
            }
        }
        projection.finishMetadata();
        AiSdkContextFragment activeTaskSnapshot = buildActiveTaskSnapshotFragment(run, events, projection);
        if (activeTaskSnapshot != null) {
            projection.fragments.add(activeTaskSnapshot);
        }
        return projection;
    }

    private void handleToolResult(Projection projection, AiSdkRun run, AiSdkRunEvent event, JSONObject payload, JSONObject data) {
        JSONObject toolResult = withEnvelope(event, payload, data);
        projection.toolResults.add(toolResult);
        String toolName = oConvertUtils.getString(toolResult.getString("toolName"));
        if ("web_search".equals(toolName)) {
            collectSources(projection, run, event, toolResult);
            return;
        }
        if (toolName.startsWith("builder_")) {
            handleBuilderToolResult(projection, run, event, toolResult, toolName);
            return;
        }
        String type = "tool_result";
        String title = oConvertUtils.getString(toolResult.getString("title"), toolName);
        String text = "工具返回：" + title + "\n工具名称=" + toolName + "\n结果=" + trimText(JSONObject.toJSONString(toolResult.get("result")), 1800);
        projection.fragments.add(fragment(run, event, type, text, toolResult));
    }

    private void collectSources(Projection projection, AiSdkRun run, AiSdkRunEvent event, JSONObject toolResult) {
        JSONObject result = toolResult.getJSONObject("result");
        JSONArray results = result == null ? null : result.getJSONArray("results");
        if (results == null || results.isEmpty()) {
            return;
        }
        for (Object item : results) {
            JSONObject source = toJsonObject(item);
            if (source == null) {
                continue;
            }
            String url = oConvertUtils.getString(source.getString("url"));
            String key = oConvertUtils.isEmpty(url) ? source.toJSONString() : url;
            if (!projection.sourceKeys.add(key)) {
                continue;
            }
            projection.sources.add(source);
            String title = oConvertUtils.getString(source.getString("title"), "未命名来源");
            String snippet = oConvertUtils.getString(source.getString("snippet"), source.getString("content"));
            String text = "联网搜索来源：标题=" + title + "，URL=" + url;
            if (oConvertUtils.isNotEmpty(snippet)) {
                text += "\n摘要：" + trimText(snippet, 1200);
            }
            projection.fragments.add(fragment(run, event, "source", text, source));
        }
    }

    private void handleBuilderToolResult(Projection projection, AiSdkRun run, AiSdkRunEvent event, JSONObject toolResult, String toolName) {
        JSONObject result = toolResult.getJSONObject("result");
        if (result == null) {
            result = new JSONObject();
        }
        String type = "tool_result";
        String text;
        if ("builder_write_file".equals(toolName) || "builder_apply_patch".equals(toolName)) {
            type = "file_change";
            JSONObject fileChange = buildFileChange(toolResult, result);
            projection.fileChanges.add(fileChange);
            projection.collectActiveFiles(result);
            text = buildFileChangeText(toolName, result);
        } else if ("builder_run_script".equals(toolName) || "builder_build_h5".equals(toolName)) {
            type = "builder_build_h5".equals(toolName) ? "build_result" : "script_result";
            projection.lastBuildResult = result;
            text = buildScriptResultText(toolName, result);
        } else if ("builder_check_preview_h5".equals(toolName)) {
            type = "preview_check";
            projection.lastBuildResult = result;
            text = buildPreviewCheckText(toolName, result);
        } else if ("builder_start_preview_h5".equals(toolName)) {
            type = "preview_url";
            projection.lastPreviewUrl = result.getString("previewUrl");
            text = buildPreviewText(toolName, result);
        } else if ("builder_create_workspace".equals(toolName) || "builder_get_snapshot".equals(toolName)) {
            type = "workspace_snapshot";
            text = buildWorkspaceText(toolName, result);
            projection.builderSnapshot = result;
            projection.collectActiveFiles(result);
        } else {
            text = "Builder 工具返回：" + toolName + "\n结果=" + trimText(result.toJSONString(), 1800);
        }
        projection.setWorkspaceId(extractWorkspaceId(result));
        projection.fragments.add(fragment(run, event, type, text, toolResult));
    }

    private JSONObject buildFileChange(JSONObject toolResult, JSONObject result) {
        JSONObject fileChange = new JSONObject();
        fileChange.put("toolName", toolResult.getString("toolName"));
        fileChange.put("toolCallId", toolResult.getString("toolCallId"));
        fileChange.put("workspaceId", extractWorkspaceId(result));
        fileChange.put("path", result.getString("path"));
        fileChange.put("changedFiles", result.getJSONArray("changedFiles"));
        fileChange.put("fileChanges", result.getJSONArray("fileChanges"));
        fileChange.put("additions", result.getInteger("additions"));
        fileChange.put("deletions", result.getInteger("deletions"));
        return fileChange;
    }

    private void rewriteFragments(AiSdkMessage assistantMessage, List<AiSdkContextFragment> fragments) {
        LambdaQueryWrapper<AiSdkContextFragment> deleteQuery = new LambdaQueryWrapper<>();
        deleteQuery.eq(AiSdkContextFragment::getMessageId, assistantMessage.getId());
        aiSdkContextFragmentMapper.delete(deleteQuery);
        for (AiSdkContextFragment fragment : fragments) {
            fragment.setMessageId(assistantMessage.getId());
            JSONObject metadata = parseObject(fragment.getMetadataJson());
            metadata.put("assistantMessageId", assistantMessage.getId());
            fragment.setMetadataJson(metadata.toJSONString());
            aiSdkContextFragmentMapper.insert(fragment);
        }
    }

    private void updateRunStatus(String runId, Projection projection, String assistantMessageId) {
        if (projection.cancelled) {
            aiSdkRunService.cancelRun(runId, assistantMessageId, projection.errorMessage);
        } else if (projection.failed) {
            aiSdkRunService.failRun(runId, assistantMessageId, projection.errorMessage);
        } else {
            aiSdkRunService.completeRun(runId, assistantMessageId);
        }
    }

    private JSONObject parsePayload(AiSdkRunEvent event) {
        if (oConvertUtils.isEmpty(event.getPayloadJson())) {
            return new JSONObject();
        }
        try {
            return JSONObject.parseObject(event.getPayloadJson());
        } catch (Exception e) {
            log.warn("解析 run_event payload 失败，eventId={}", event.getId(), e);
            return new JSONObject();
        }
    }

    private JSONObject parseObject(String json) {
        if (oConvertUtils.isEmpty(json)) {
            return new JSONObject();
        }
        try {
            return JSONObject.parseObject(json);
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private JSONObject withEnvelope(AiSdkRunEvent event, JSONObject payload, JSONObject data) {
        JSONObject value = data == null ? new JSONObject() : new JSONObject(data);
        value.put("event", oConvertUtils.getString(event.getEventType(), payload.getString("event")));
        value.put("version", payload.getString("version"));
        value.put("runId", payload.getString("runId"));
        value.put("sequence", event.getSequence());
        value.put("eventId", event.getId());
        value.put("phase", event.getPhase());
        value.put("status", event.getStatus());
        value.put("timestamp", payload.getLong("timestamp"));
        value.put("messageId", payload.getString("messageId"));
        value.put("conversationId", event.getConversationId());
        value.put("topicId", payload.getString("topicId"));
        return value;
    }

    private AiSdkContextFragment fragment(AiSdkRun run, AiSdkRunEvent event, String type, String text, JSONObject metadata) {
        JSONObject fragmentMetadata = metadata == null ? new JSONObject() : new JSONObject(metadata);
        fragmentMetadata.put("runId", run.getId());
        fragmentMetadata.put("eventId", event.getId());
        fragmentMetadata.put("sequence", event.getSequence());
        String content = trimText(oConvertUtils.getString(text), 4000);
        return new AiSdkContextFragment()
                .setId(UUIDGenerator.generate())
                .setConversationId(run.getConversationId())
                .setMessageId(run.getAssistantMessageId())
                .setType(type)
                .setText(content)
                .setTokenCount(estimateTokenCount(content))
                .setEmbeddingStatus("pending")
                .setMetadataJson(fragmentMetadata.toJSONString())
                .setCreateTime(new Date());
    }

    private AiSdkContextFragment buildActiveTaskSnapshotFragment(AiSdkRun run, List<AiSdkRunEvent> events, Projection projection) {
        if (events == null || events.isEmpty()) {
            return null;
        }
        JSONObject snapshot = new JSONObject();
        snapshot.put("snapshotType", "active_task_snapshot");
        snapshot.put("snapshotVersion", 1);
        snapshot.put("conversationId", run.getConversationId());
        snapshot.put("runId", run.getId());
        snapshot.put("userMessageId", run.getUserMessageId());
        snapshot.put("assistantMessageId", run.getAssistantMessageId());
        snapshot.put("userInput", trimText(projection.userInput, 800));
        snapshot.put("intent", projection.intent);
        snapshot.put("riskLevel", projection.riskLevel);
        snapshot.put("operationNote", trimText(projection.operationNote, 800));
        snapshot.put("proposedSteps", projection.proposedSteps);
        snapshot.put("verificationSteps", projection.verificationSteps);
        snapshot.put("skillIds", projection.skillIds);
        snapshot.put("skillEvents", projection.skillEvents);
        snapshot.put("activeWorkspaceId", projection.activeWorkspaceId());
        snapshot.put("activeFiles", projection.activeFiles());
        snapshot.put("fileChanges", projection.fileChanges);
        snapshot.put("builderSnapshot", projection.builderSnapshot);
        snapshot.put("lastBuildResult", projection.lastBuildResult);
        snapshot.put("lastPreviewUrl", projection.lastPreviewUrl);
        snapshot.put("lastError", projection.errorMessage);
        snapshot.put("status", projection.messageStatus());
        snapshot.put("nextStepHint", buildNextStepHint(projection));

        String text = "当前任务状态快照："
                + "\n用户目标=" + trimText(projection.userInput, 800)
                + "\n意图=" + oConvertUtils.getString(projection.intent)
                + "，风险=" + oConvertUtils.getString(projection.riskLevel)
                + "\n操作说明=" + trimText(projection.operationNote, 800)
                + "\n当前工作区=" + oConvertUtils.getString(projection.activeWorkspaceId())
                + "\n相关文件=" + trimText(projection.activeFiles().toJSONString(), 1200)
                + "\n已变更文件=" + trimText(projection.fileChanges.toJSONString(), 1200)
                + "\n最近构建/验证=" + trimText(projection.lastBuildResult == null ? "" : projection.lastBuildResult.toJSONString(), 1000)
                + "\n下一步=" + buildNextStepHint(projection);

        AiSdkRunEvent latestEvent = events.get(events.size() - 1);
        JSONObject metadata = new JSONObject(snapshot);
        metadata.put("workspaceId", projection.activeWorkspaceId());
        return fragment(run, latestEvent, "active_task_snapshot", text, metadata);
    }

    private String buildNextStepHint(Projection projection) {
        if (projection.failed) {
            return "先分析错误原因，再读取相关文件或运行校验后修复。";
        }
        if (!projection.fileChanges.isEmpty()) {
            return "继续时优先围绕已变更文件和用户目标处理，不要重新丢失工作区。";
        }
        if (oConvertUtils.isNotEmpty(projection.activeWorkspaceId())) {
            return "继续时优先使用当前工作区，并按用户最新输入决定读取、修改或验证。";
        }
        return "继续时优先结合用户目标、最近原文和相关上下文片段。";
    }

    private String buildPreflightText(JSONObject data) {
        if (data == null) {
            return "执行前检查完成";
        }
        String text = "执行前检查：intent=" + oConvertUtils.getString(data.getString("intent"))
                + "，riskLevel=" + oConvertUtils.getString(data.getString("riskLevel"));
        String note = oConvertUtils.getString(data.getString("operationNote"), data.getString("summary"));
        if (oConvertUtils.isNotEmpty(note)) {
            text += "\n说明：" + note;
        }
        JSONArray steps = data.getJSONArray("proposedSteps");
        if (steps != null && !steps.isEmpty()) {
            text += "\n计划：" + trimText(steps.toJSONString(), 1000);
        }
        return text;
    }

    private String buildSkillText(String eventType, JSONObject data) {
        if (data == null) {
            return "Skill 事件：" + eventType;
        }
        String skillName = oConvertUtils.getString(data.getString("skillName"), data.getString("skillId"));
        String stage = oConvertUtils.getString(data.getString("stage"));
        String status = oConvertUtils.getString(data.getString("status"));
        String message = oConvertUtils.getString(data.getString("message"), data.getString("description"));
        return "Skill 执行结果：" + skillName
                + "\n事件=" + eventType
                + "\n阶段=" + stage
                + "\n状态=" + status
                + "\n说明：" + trimText(message, 1200);
    }

    private String buildContextText(JSONObject data) {
        return "上下文选择：" + trimText(data == null ? "" : data.toJSONString(), 1800);
    }

    private String buildFileChangeText(String toolName, JSONObject result) {
        return "Builder 文件变更：workspaceId=" + extractWorkspaceId(result)
                + "\n工具名称=" + toolName
                + "\n文件路径=" + oConvertUtils.getString(result.getString("path"))
                + "\n变更文件=" + trimText(JSONObject.toJSONString(result.get("changedFiles")), 1000)
                + "\n文件变更=" + trimText(JSONObject.toJSONString(result.get("fileChanges")), 1000)
                + "\n变更行数：+" + oConvertUtils.getString(result.get("additions")) + " -" + oConvertUtils.getString(result.get("deletions"));
    }

    private String buildScriptResultText(String toolName, JSONObject result) {
        return "Builder 命令结果：workspaceId=" + extractWorkspaceId(result)
                + "\n工具名称=" + toolName
                + "\n状态=" + oConvertUtils.getString(result.getString("status"))
                + "，exitCode=" + oConvertUtils.getString(result.get("exitCode"))
                + "\n命令=" + trimText(JSONObject.toJSONString(result.get("command")), 500)
                + "\nstdout：" + trimText(oConvertUtils.getString(result.getString("stdout")), 1200)
                + "\nstderr：" + trimText(oConvertUtils.getString(result.getString("stderr")), 1200);
    }

    private String buildPreviewCheckText(String toolName, JSONObject result) {
        return "Builder 预览检查：workspaceId=" + extractWorkspaceId(result)
                + "\n工具名称=" + toolName
                + "\n状态=" + oConvertUtils.getString(result.getString("status"))
                + "\n预览地址=" + oConvertUtils.getString(result.getString("previewUrl"))
                + "\n说明=" + trimText(result.toJSONString(), 1600);
    }

    private String buildPreviewText(String toolName, JSONObject result) {
        return "Builder H5 预览：workspaceId=" + extractWorkspaceId(result)
                + "\n工具名称=" + toolName
                + "\n状态=" + oConvertUtils.getString(result.getString("status"))
                + "\n预览地址=" + oConvertUtils.getString(result.getString("previewUrl"));
    }

    private String buildWorkspaceText(String toolName, JSONObject result) {
        return "Builder 工作区快照：workspaceId=" + extractWorkspaceId(result)
                + "\n工具名称=" + toolName
                + "\n内容=" + trimText(result.toJSONString(), 1800);
    }

    private String extractWorkspaceId(JSONObject result) {
        String workspaceId = oConvertUtils.getString(result.getString("workspaceId"));
        if (oConvertUtils.isNotEmpty(workspaceId)) {
            return workspaceId;
        }
        JSONObject workspace = result.getJSONObject("workspace");
        if (workspace != null) {
            workspaceId = oConvertUtils.getString(workspace.getString("id"), workspace.getString("workspaceId"));
            if (oConvertUtils.isNotEmpty(workspaceId)) {
                return workspaceId;
            }
        }
        JSONObject snapshot = result.getJSONObject("snapshot");
        if (snapshot != null) {
            workspaceId = oConvertUtils.getString(snapshot.getString("workspaceId"), snapshot.getString("id"));
        }
        return oConvertUtils.getString(workspaceId);
    }

    private JSONObject toJsonObject(Object value) {
        if (value instanceof JSONObject jsonObject) {
            return jsonObject;
        }
        if (value instanceof Map) {
            return new JSONObject((Map<String, Object>) value);
        }
        return null;
    }

    private String trimText(String text, int maxLength) {
        String value = oConvertUtils.getString(text);
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength) + "...";
    }

    private int estimateTokenCount(String text) {
        String value = oConvertUtils.getString(text);
        if (value.isEmpty()) {
            return 0;
        }
        return Math.max(1, (int) Math.ceil(value.length() / 3.5));
    }

    private static class Projection {
        private final StringBuilder content = new StringBuilder();
        private final JSONObject metadata = new JSONObject();
        private final JSONArray toolCalls = new JSONArray();
        private final JSONArray toolResults = new JSONArray();
        private final JSONArray sources = new JSONArray();
        private final JSONArray skillEvents = new JSONArray();
        private final JSONArray contextEvents = new JSONArray();
        private final JSONArray errors = new JSONArray();
        private final JSONArray fileChanges = new JSONArray();
        private final JSONArray activeFiles = new JSONArray();
        private final List<AiSdkContextFragment> fragments = new java.util.ArrayList<>();
        private final Set<String> sourceKeys = new LinkedHashSet<>();
        private final Set<String> activeFileKeys = new LinkedHashSet<>();
        private final String modelId;
        private final String userInput;
        private final Object skillIds;
        private JSONObject builderSnapshot;
        private JSONObject lastBuildResult;
        private String lastPreviewUrl;
        private String workspaceId;
        private String intent;
        private String riskLevel;
        private String operationNote;
        private JSONArray proposedSteps = new JSONArray();
        private JSONArray verificationSteps = new JSONArray();
        private boolean failed;
        private boolean cancelled;
        private String errorMessage;

        private Projection(AiSdkRun run) {
            JSONObject runMetadata = JSONObject.parseObject(oConvertUtils.getString(run.getMetadataJson(), "{}"));
            modelId = runMetadata.getString("modelId");
            userInput = oConvertUtils.getString(runMetadata.getString("input"));
            skillIds = runMetadata.get("skillIds");
            failed = AiSdkRunServiceImpl.STATUS_FAILED.equals(run.getStatus());
            cancelled = AiSdkRunServiceImpl.STATUS_CANCELLED.equals(run.getStatus());
            errorMessage = run.getErrorMessage();
            metadata.put("attachments", runMetadata.get("attachments"));
            metadata.put("model", runMetadata);
            metadata.put("params", runMetadata);
            metadata.put("run", runMetadata);
            metadata.put("runId", run.getId());
            metadata.put("userMessageId", run.getUserMessageId());
        }

        private void capturePreflight(JSONObject data) {
            if (data == null) {
                return;
            }
            intent = oConvertUtils.getString(data.getString("intent"));
            riskLevel = oConvertUtils.getString(data.getString("riskLevel"));
            operationNote = oConvertUtils.getString(data.getString("operationNote"), data.getString("summary"));
            JSONArray steps = data.getJSONArray("proposedSteps");
            if (steps != null) {
                proposedSteps = steps;
            }
            JSONArray verifySteps = data.getJSONArray("verificationSteps");
            if (verifySteps != null) {
                verificationSteps = verifySteps;
            }
        }

        private void setWorkspaceId(String value) {
            if (oConvertUtils.isNotEmpty(value)) {
                workspaceId = value;
            }
        }

        private String activeWorkspaceId() {
            if (oConvertUtils.isNotEmpty(workspaceId)) {
                return workspaceId;
            }
            if (builderSnapshot == null) {
                return "";
            }
            String value = oConvertUtils.getString(builderSnapshot.getString("workspaceId"));
            if (oConvertUtils.isNotEmpty(value)) {
                return value;
            }
            JSONObject workspace = builderSnapshot.getJSONObject("workspace");
            if (workspace != null) {
                value = oConvertUtils.getString(workspace.getString("id"), workspace.getString("workspaceId"));
                if (oConvertUtils.isNotEmpty(value)) {
                    return value;
                }
            }
            JSONObject snapshot = builderSnapshot.getJSONObject("snapshot");
            if (snapshot != null) {
                return oConvertUtils.getString(snapshot.getString("workspaceId"), snapshot.getString("id"));
            }
            return "";
        }

        private JSONArray activeFiles() {
            return activeFiles;
        }

        private void collectActiveFiles(JSONObject result) {
            if (result == null) {
                return;
            }
            addActiveFile(result.getString("path"));
            JSONArray changedFiles = result.getJSONArray("changedFiles");
            if (changedFiles != null) {
                for (Object item : changedFiles) {
                    if (item instanceof JSONObject jsonObject) {
                        addActiveFile(jsonObject.getString("path"));
                    } else {
                        addActiveFile(oConvertUtils.getString(item));
                    }
                }
            }
            JSONArray fileChanges = result.getJSONArray("fileChanges");
            if (fileChanges != null) {
                for (Object item : fileChanges) {
                    JSONObject change = toJsonObjectValue(item);
                    if (change != null) {
                        addActiveFile(change.getString("path"));
                    }
                }
            }
            JSONObject snapshot = result.getJSONObject("snapshot");
            if (snapshot != null) {
                JSONArray pages = snapshot.getJSONArray("pages");
                if (pages != null) {
                    for (Object item : pages) {
                        JSONObject page = toJsonObjectValue(item);
                        if (page != null) {
                            addActiveFile(page.getString("path"));
                        }
                    }
                }
            }
        }

        private void addActiveFile(String path) {
            String value = oConvertUtils.getString(path).trim();
            if (value.isEmpty() || !activeFileKeys.add(value)) {
                return;
            }
            activeFiles.add(value);
        }

        private JSONObject toJsonObjectValue(Object value) {
            if (value instanceof JSONObject jsonObject) {
                return jsonObject;
            }
            if (value instanceof Map) {
                return new JSONObject((Map<String, Object>) value);
            }
            return null;
        }

        private void finishMetadata() {
            metadata.put("toolCalls", toolCalls);
            metadata.put("toolResults", toolResults);
            metadata.put("sources", sources);
            metadata.put("skillEvents", skillEvents);
            metadata.put("contextEvents", contextEvents);
            metadata.put("fileChanges", fileChanges);
            if (builderSnapshot != null) {
                metadata.put("builderSnapshot", builderSnapshot);
            }
            if (!errors.isEmpty()) {
                metadata.put("errors", errors);
            }
        }

        private String messageStatus() {
            if (cancelled) {
                return "cancelled";
            }
            return failed ? "failed" : "completed";
        }
    }
}
