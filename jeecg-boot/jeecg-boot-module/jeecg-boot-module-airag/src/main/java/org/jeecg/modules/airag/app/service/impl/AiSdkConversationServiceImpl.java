package org.jeecg.modules.airag.app.service.impl;

import com.alibaba.fastjson.JSONObject;
import com.alibaba.fastjson.TypeReference;
import com.alibaba.fastjson.JSONArray;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.shiro.SecurityUtils;
import org.jeecg.common.exception.JeecgBootException;
import org.jeecg.common.system.vo.LoginUser;
import org.jeecg.common.util.AssertUtils;
import org.jeecg.common.util.TokenUtils;
import org.jeecg.common.util.UUIDGenerator;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.airag.app.config.AiOrchestratorProperties;
import org.jeecg.modules.airag.app.entity.AiSdkConversation;
import org.jeecg.modules.airag.app.entity.AiSdkContextFragment;
import org.jeecg.modules.airag.app.entity.AiSdkMessage;
import org.jeecg.modules.airag.app.entity.AiSdkRun;
import org.jeecg.modules.airag.app.entity.AiSdkRunEvent;
import org.jeecg.modules.airag.app.entity.AiragApp;
import org.jeecg.modules.airag.app.mapper.AiSdkConversationMapper;
import org.jeecg.modules.airag.app.mapper.AiSdkContextFragmentMapper;
import org.jeecg.modules.airag.app.mapper.AiSdkMessageMapper;
import org.jeecg.modules.airag.app.mapper.AiSdkRunEventMapper;
import org.jeecg.modules.airag.app.mapper.AiSdkRunMapper;
import org.jeecg.modules.airag.app.service.IAiSdkConversationService;
import org.jeecg.modules.airag.app.vo.AiSdkConversationCreateParams;
import org.jeecg.modules.airag.app.vo.AiSdkConversationRenameParams;
import org.jeecg.modules.airag.app.vo.AiSdkConversationVo;
import org.jeecg.modules.airag.app.vo.AiSdkMessageVo;
import org.jeecg.modules.airag.app.vo.AiSdkRunEventVo;
import org.jeecg.modules.airag.app.vo.AppDebugParams;
import org.jeecg.modules.airag.llm.consts.LLMConsts;
import org.jeecg.modules.airag.llm.entity.AiragModel;
import org.jeecg.modules.airag.llm.handler.EmbeddingHandler;
import org.jeecg.modules.airag.llm.mapper.AiragModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * AI SDK 会话服务实现
 */
@Service
public class AiSdkConversationServiceImpl extends ServiceImpl<AiSdkConversationMapper, AiSdkConversation> implements IAiSdkConversationService {

    private static final String DEFAULT_SESSION_TYPE = "ai-sdk-chat";
    private static final String MESSAGE_STATUS_COMPLETED = "completed";
    private static final int COMPACTION_MIN_MESSAGE_COUNT = 24;
    private static final int COMPACTION_MIN_TOKEN_COUNT = 24000;
    private static final int RECENT_RAW_MESSAGE_COUNT = 12;
    private static final int COMPACTION_MAX_MESSAGE_COUNT = 80;

    @Autowired
    private AiSdkMessageMapper aiSdkMessageMapper;

    @Autowired
    private AiSdkContextFragmentMapper aiSdkContextFragmentMapper;

    @Autowired
    private AiSdkRunMapper aiSdkRunMapper;

    @Autowired
    private AiSdkRunEventMapper aiSdkRunEventMapper;

    @Autowired
    private EmbeddingHandler embeddingHandler;

    @Autowired
    private AiOrchestratorProperties orchestratorProperties;

    @Autowired
    private AiragModelMapper airagModelMapper;

    @Override
    public AiSdkConversation ensureConversation(AiragApp app, AppDebugParams request, HttpServletRequest httpRequest) {
        String conversationId = oConvertUtils.getString(request.getConversationId(), UUIDGenerator.generate());
        request.setConversationId(conversationId);

        AiSdkConversation conversation = getById(conversationId);
        Date now = new Date();
        if (conversation == null) {
            LoginUser loginUser = getLoginUser();
            conversation = new AiSdkConversation()
                    .setId(conversationId)
                    .setUserId(loginUser == null ? null : loginUser.getId())
                    .setUsername(loginUser == null ? null : loginUser.getUsername())
                    .setTenantId(TokenUtils.getTenantIdByRequest(httpRequest))
                    .setSessionType(oConvertUtils.getString(request.getSessionType(), DEFAULT_SESSION_TYPE))
                    .setTitle(buildTitle(request.getContent()))
                    .setAppId(app.getId())
                    .setAppName(app.getName())
                    .setModelId(app.getModelId())
                    .setSummaryTokenCount(0)
                    .setContextVersion(0)
                    .setActiveContextTokenCount(0)
                    .setMetadataJson(buildConversationMetadata(request).toJSONString())
                    .setCreateTime(now)
                    .setUpdateTime(now);
            save(conversation);
            return conversation;
        }

        conversation
                .setAppId(app.getId())
                .setAppName(app.getName())
                .setModelId(app.getModelId())
                .setMetadataJson(mergeConversationMetadata(conversation.getMetadataJson(), buildConversationMetadata(request)).toJSONString())
                .setUpdateTime(now);
        if (oConvertUtils.isEmpty(conversation.getTitle()) || "新建对话".equals(conversation.getTitle())) {
            conversation.setTitle(buildTitle(request.getContent()));
        }
        updateById(conversation);
        return conversation;
    }

    @Override
    public AiSdkMessage saveUserMessage(AiSdkConversation conversation, AiragApp app, AppDebugParams request) {
        AiSdkMessage message = buildMessage(conversation.getId(), "user", request.getContent(), MESSAGE_STATUS_COMPLETED, app, request);
        aiSdkMessageMapper.insert(message);
        rebuildContextFragments(message);
        touchConversation(conversation.getId());
        return message;
    }

    @Override
    public AiSdkMessage saveAssistantMessage(String conversationId, String content, String status, AiragApp app, AppDebugParams request) {
        return saveAssistantMessage(conversationId, content, status, app, request, null);
    }

    @Override
    public AiSdkMessage saveAssistantMessage(String conversationId, String content, String status, AiragApp app, AppDebugParams request, Map<String, Object> metadata) {
        if (oConvertUtils.isEmpty(content) && (metadata == null || metadata.isEmpty())) {
            return null;
        }
        AiSdkMessage message = buildMessage(conversationId, "assistant", oConvertUtils.getString(content), oConvertUtils.getString(status, MESSAGE_STATUS_COMPLETED), app, request, metadata);
        aiSdkMessageMapper.insert(message);
        rebuildContextFragments(message);
        touchConversation(conversationId);
        return message;
    }

    @Override
    public AiSdkMessage saveAssistantMessageProjection(String messageId, String conversationId, String content, String status, String modelId, Map<String, Object> metadata) {
        if (oConvertUtils.isEmpty(content) && (metadata == null || metadata.isEmpty())) {
            return null;
        }
        JSONObject metadataJson = metadata == null ? new JSONObject() : new JSONObject(metadata);
        AiSdkMessage message = oConvertUtils.isEmpty(messageId) ? null : aiSdkMessageMapper.selectById(messageId);
        if (message == null) {
            message = new AiSdkMessage()
                    .setId(oConvertUtils.isEmpty(messageId) ? UUIDGenerator.generate() : messageId)
                    .setConversationId(conversationId)
                    .setRole("assistant")
                    .setCreateTime(new Date());
            message
                    .setContent(oConvertUtils.getString(content))
                    .setStatus(oConvertUtils.getString(status, MESSAGE_STATUS_COMPLETED))
                    .setModelId(modelId)
                    .setMetadataJson(metadataJson.toJSONString());
            aiSdkMessageMapper.insert(message);
        } else {
            message
                    .setConversationId(conversationId)
                    .setRole("assistant")
                    .setContent(oConvertUtils.getString(content))
                    .setStatus(oConvertUtils.getString(status, MESSAGE_STATUS_COMPLETED))
                    .setModelId(modelId)
                    .setMetadataJson(metadataJson.toJSONString());
            aiSdkMessageMapper.updateById(message);
        }
        touchConversation(conversationId);
        return message;
    }

    @Override
    public List<Map<String, Object>> findLatestAttachments(String conversationId, HttpServletRequest httpRequest) {
        assertConversationOwner(conversationId, httpRequest);
        LambdaQueryWrapper<AiSdkMessage> query = new LambdaQueryWrapper<>();
        query.eq(AiSdkMessage::getConversationId, conversationId);
        query.orderByDesc(AiSdkMessage::getCreateTime);
        query.last("LIMIT 20");
        for (AiSdkMessage message : aiSdkMessageMapper.selectList(query)) {
            List<Map<String, Object>> attachments = parseAttachmentsFromMetadata(message.getMetadataJson());
            if (!attachments.isEmpty()) {
                return attachments;
            }
        }
        return new ArrayList<>();
    }

    @Override
    public Map<String, Object> buildContextSource(String conversationId, String currentMessageId, String queryText, HttpServletRequest httpRequest) {
        AiSdkConversation conversation = assertConversationOwner(conversationId, httpRequest);
        Map<String, Object> contextSource = new HashMap<>();
        contextSource.put("summary", buildSummaryContext(conversation));
        contextSource.put("active_task_snapshots", buildRecentFragmentContext(conversationId, currentMessageId, "active_task_snapshot"));
        contextSource.put("recent_messages", buildRecentMessageContext(conversationId, currentMessageId));
        contextSource.put("relevant_messages", buildRelevantMessageContext(conversationId, currentMessageId, queryText));
        contextSource.put("relevant_fragments", buildRelevantFragmentContext(conversationId, currentMessageId, queryText));
        contextSource.put("attachment_candidates", buildRecentFragmentContext(conversationId, currentMessageId, "attachment_summary"));
        contextSource.put("attachment_matches", buildAttachmentMatchContext(conversationId, currentMessageId, queryText));
        contextSource.put("attachment_summaries", new ArrayList<>());
        return contextSource;
    }

    @Override
    public void embedPendingContextFragments(String conversationId, HttpServletRequest httpRequest) {
        assertConversationOwner(conversationId, httpRequest);
        embedPendingContextFragments(conversationId);
    }

    @Override
    public void embedPendingContextFragments(String conversationId) {
        if (!orchestratorProperties.isContextEmbeddingEnabled()) {
            return;
        }
        AiSdkConversation conversation = getById(conversationId);
        if (conversation == null) {
            throw new JeecgBootException("会话不存在或无权访问");
        }
        List<AiSdkContextFragment> fragments = findPendingFragmentEntities(conversationId, orchestratorProperties.getContextEmbeddingBatchSize());
        if (fragments.isEmpty()) {
            return;
        }
        List<Map<String, Object>> fragmentContexts = new ArrayList<>();
        for (AiSdkContextFragment fragment : fragments) {
            fragmentContexts.add(toFragmentContext(fragment));
        }
        try {
            String embedModelId = resolveContextEmbedModelId();
            embeddingHandler.addAiSdkContextFragments(
                    embedModelId,
                    fragmentContexts,
                    buildAiSdkContextBaseMetadata(conversation)
            );
            for (AiSdkContextFragment fragment : fragments) {
                fragment
                        .setEmbeddingModelId(oConvertUtils.getString(embedModelId))
                        .setEmbeddingStatus("completed")
                        .setEmbeddingError(null)
                        .setEmbeddingTime(new Date());
                aiSdkContextFragmentMapper.updateById(fragment);
            }
        } catch (Exception e) {
            for (AiSdkContextFragment fragment : fragments) {
                fragment
                        .setEmbeddingStatus("failed")
                        .setEmbeddingError(trimText(e.getMessage(), 1000))
                        .setEmbeddingTime(new Date());
                aiSdkContextFragmentMapper.updateById(fragment);
            }
        }
    }

    private List<AiSdkContextFragment> findPendingFragmentEntities(String conversationId, Integer limit) {
        LambdaQueryWrapper<AiSdkContextFragment> query = new LambdaQueryWrapper<>();
        query.eq(AiSdkContextFragment::getConversationId, conversationId);
        query.in(AiSdkContextFragment::getEmbeddingStatus, "pending", "failed");
        query.isNotNull(AiSdkContextFragment::getText);
        query.orderByAsc(AiSdkContextFragment::getCreateTime);
        query.last("LIMIT " + Math.max(1, Math.min(limit == null ? 20 : limit, 50)));
        return aiSdkContextFragmentMapper.selectList(query);
    }

    @Override
    public boolean shouldCompactContext(String conversationId, String currentMessageId, HttpServletRequest httpRequest) {
        assertConversationOwner(conversationId, httpRequest);
        return shouldCompactContext(conversationId, currentMessageId);
    }

    @Override
    public boolean shouldCompactContext(String conversationId, String currentMessageId) {
        AiSdkConversation conversation = getById(conversationId);
        if (conversation == null) {
            throw new JeecgBootException("会话不存在或无权访问");
        }
        LambdaQueryWrapper<AiSdkMessage> query = new LambdaQueryWrapper<>();
        query.eq(AiSdkMessage::getConversationId, conversationId);
        if (oConvertUtils.isNotEmpty(conversation.getSummaryMessageId())) {
            Date summaryTime = findMessageCreateTime(conversation.getSummaryMessageId());
            if (summaryTime != null) {
                query.gt(AiSdkMessage::getCreateTime, summaryTime);
            }
        }
        if (oConvertUtils.isNotEmpty(currentMessageId)) {
            query.ne(AiSdkMessage::getId, currentMessageId);
        }
        query.in(AiSdkMessage::getRole, "user", "assistant");
        List<AiSdkMessage> messages = aiSdkMessageMapper.selectList(query);
        if (messages.size() >= COMPACTION_MIN_MESSAGE_COUNT) {
            return true;
        }
        int tokenCount = 0;
        for (AiSdkMessage message : messages) {
            tokenCount += estimateTokenCount(message.getContent());
        }
        return tokenCount >= COMPACTION_MIN_TOKEN_COUNT;
    }

    @Override
    public Map<String, Object> buildCompactionSource(String conversationId, String currentMessageId, HttpServletRequest httpRequest) {
        assertConversationOwner(conversationId, httpRequest);
        return buildCompactionSource(conversationId, currentMessageId);
    }

    @Override
    public Map<String, Object> buildCompactionSource(String conversationId, String currentMessageId) {
        AiSdkConversation conversation = getById(conversationId);
        if (conversation == null) {
            throw new JeecgBootException("会话不存在或无权访问");
        }
        List<Map<String, Object>> messages = buildCompactionMessageContext(conversation, currentMessageId);
        List<String> messageIds = new ArrayList<>();
        for (Map<String, Object> message : messages) {
            Object id = message.get("id");
            if (id != null) {
                messageIds.add(String.valueOf(id));
            }
        }
        Map<String, Object> source = new HashMap<>();
        source.put("previous_summary", buildSummaryContext(conversation));
        source.put("messages", messages);
        source.put("fragments", buildCompactionFragmentContext(conversationId, messageIds));
        return source;
    }

    @Override
    public void updateConversationSummary(String conversationId, String summary, String summaryMessageId, Integer summaryTokenCount, String activeContextSnapshot, Integer activeContextTokenCount, Map<String, Object> tokenLedger, Map<String, Object> metadata, HttpServletRequest httpRequest) {
        assertConversationOwner(conversationId, httpRequest);
        updateConversationSummary(conversationId, summary, summaryMessageId, summaryTokenCount, activeContextSnapshot, activeContextTokenCount, tokenLedger, metadata);
    }

    @Override
    public void updateConversationSummary(String conversationId, String summary, String summaryMessageId, Integer summaryTokenCount, String activeContextSnapshot, Integer activeContextTokenCount, Map<String, Object> tokenLedger, Map<String, Object> metadata) {
        AiSdkConversation conversation = getById(conversationId);
        if (conversation == null) {
            throw new JeecgBootException("会话不存在或无权访问");
        }
        JSONObject conversationMetadata = parseMetadataObject(conversation.getMetadataJson());
        if (metadata != null) {
            conversationMetadata.put("contextSummary", metadata);
        }
        JSONObject ledgerJson = tokenLedger == null ? new JSONObject() : new JSONObject(tokenLedger);
        if (!ledgerJson.isEmpty()) {
            conversationMetadata.put("contextLedger", ledgerJson);
        }
        int nextContextVersion = (conversation.getContextVersion() == null ? 0 : conversation.getContextVersion()) + 1;
        conversationMetadata.put("contextVersion", nextContextVersion);
        conversationMetadata.put("activeContextSnapshotVersion", metadata == null ? 1 : oConvertUtils.getInt(metadata.get("activeContextSnapshotVersion"), 1));
        int resolvedSummaryTokenCount = summaryTokenCount == null ? estimateTokenCount(summary) : summaryTokenCount;
        String resolvedSnapshot = oConvertUtils.isNotEmpty(activeContextSnapshot) ? activeContextSnapshot : summary;
        int resolvedSnapshotTokenCount = activeContextTokenCount == null ? estimateTokenCount(resolvedSnapshot) : activeContextTokenCount;
        conversation
                .setSummary(summary)
                .setSummaryMessageId(summaryMessageId)
                .setSummaryTokenCount(resolvedSummaryTokenCount)
                .setContextVersion(nextContextVersion)
                .setActiveContextSnapshot(resolvedSnapshot)
                .setActiveContextTokenCount(resolvedSnapshotTokenCount)
                .setLastModelInputTokens(getLedgerInteger(ledgerJson, "lastModelInputTokens"))
                .setLastModelOutputTokens(getLedgerInteger(ledgerJson, "lastModelOutputTokens"))
                .setLastModelTotalTokens(getLedgerInteger(ledgerJson, "lastModelTotalTokens"))
                .setEstimatedAddedTokens(getLedgerInteger(ledgerJson, "estimatedAddedTokens"))
                .setContextWindow(getLedgerInteger(ledgerJson, "contextWindow"))
                .setCompactThresholdTokens(getLedgerInteger(ledgerJson, "compactThresholdTokens"))
                .setMetadataJson(conversationMetadata.toJSONString())
                .setUpdateTime(new Date());
        updateById(conversation);
    }

    @Override
    public AiSdkConversationVo createConversation(AiSdkConversationCreateParams params, HttpServletRequest httpRequest) {
        Date now = new Date();
        LoginUser loginUser = getLoginUser();
        AiSdkConversation conversation = new AiSdkConversation()
                .setId(UUIDGenerator.generate())
                .setUserId(loginUser == null ? null : loginUser.getId())
                .setUsername(loginUser == null ? null : loginUser.getUsername())
                .setTenantId(TokenUtils.getTenantIdByRequest(httpRequest))
                .setSessionType(oConvertUtils.getString(params.getSessionType(), DEFAULT_SESSION_TYPE))
                .setTitle(oConvertUtils.getString(params.getTitle(), "新建对话"))
                .setAppId(oConvertUtils.getString(params.getAppId(), "ai-sdk-dev"))
                .setAppName(oConvertUtils.getString(params.getAppName(), "JeecgBoot AI 助手"))
                .setModelId(params.getModelId())
                .setSummaryTokenCount(0)
                .setContextVersion(0)
                .setActiveContextTokenCount(0)
                .setMetadataJson(buildConversationMetadata(params).toJSONString())
                .setCreateTime(now)
                .setUpdateTime(now);
        save(conversation);
        return toConversationVo(conversation);
    }

    @Override
    public List<AiSdkConversationVo> listConversations(String sessionType, HttpServletRequest httpRequest) {
        LambdaQueryWrapper<AiSdkConversation> query = new LambdaQueryWrapper<>();
        appendOwnerCondition(query, httpRequest);
        query.eq(AiSdkConversation::getSessionType, oConvertUtils.getString(sessionType, DEFAULT_SESSION_TYPE));
        query.orderByDesc(AiSdkConversation::getUpdateTime);
        query.last("LIMIT 100");
        List<AiSdkConversationVo> result = new ArrayList<>();
        for (AiSdkConversation conversation : list(query)) {
            result.add(toConversationVo(conversation));
        }
        return result;
    }

    @Override
    public List<AiSdkMessageVo> listMessages(String conversationId, HttpServletRequest httpRequest) {
        assertConversationOwner(conversationId, httpRequest);
        LambdaQueryWrapper<AiSdkMessage> query = new LambdaQueryWrapper<>();
        query.eq(AiSdkMessage::getConversationId, conversationId);
        query.orderByAsc(AiSdkMessage::getCreateTime);
        List<AiSdkMessage> messages = aiSdkMessageMapper.selectList(query);
        List<AiSdkMessageVo> result = new ArrayList<>();
        for (AiSdkMessage message : messages) {
            result.add(toMessageVo(message));
        }
        attachRunEvents(conversationId, result);
        return result;
    }

    @Override
    public void renameConversation(String conversationId, AiSdkConversationRenameParams params, HttpServletRequest httpRequest) {
        AiSdkConversation conversation = assertConversationOwner(conversationId, httpRequest);
        String title = oConvertUtils.getString(params.getTitle()).replaceAll("\\s+", " ").trim();
        AssertUtils.assertNotEmpty("请输入会话名称", title);
        conversation.setTitle(title.length() > 40 ? title.substring(0, 40) : title);
        conversation.setUpdateTime(new Date());
        updateById(conversation);
    }

    @Override
    public void deleteConversation(String conversationId, HttpServletRequest httpRequest) {
        assertConversationOwner(conversationId, httpRequest);
        try {
            embeddingHandler.deleteAiSdkContextFragmentsByConversation(resolveContextEmbedModelId(), conversationId);
        } catch (Exception ignored) {
        }
        LambdaQueryWrapper<AiSdkContextFragment> fragmentQuery = new LambdaQueryWrapper<>();
        fragmentQuery.eq(AiSdkContextFragment::getConversationId, conversationId);
        aiSdkContextFragmentMapper.delete(fragmentQuery);
        LambdaQueryWrapper<AiSdkMessage> messageQuery = new LambdaQueryWrapper<>();
        messageQuery.eq(AiSdkMessage::getConversationId, conversationId);
        aiSdkMessageMapper.delete(messageQuery);
        LambdaQueryWrapper<AiSdkRunEvent> runEventQuery = new LambdaQueryWrapper<>();
        runEventQuery.eq(AiSdkRunEvent::getConversationId, conversationId);
        aiSdkRunEventMapper.delete(runEventQuery);
        LambdaQueryWrapper<AiSdkRun> runQuery = new LambdaQueryWrapper<>();
        runQuery.eq(AiSdkRun::getConversationId, conversationId);
        aiSdkRunMapper.delete(runQuery);
        removeById(conversationId);
    }

    private AiSdkMessage buildMessage(String conversationId, String role, String content, String status, AiragApp app, AppDebugParams request) {
        return buildMessage(conversationId, role, content, status, app, request, null);
    }

    private AiSdkMessage buildMessage(String conversationId, String role, String content, String status, AiragApp app, AppDebugParams request, Map<String, Object> metadata) {
        JSONObject metadataJson = buildMessageMetadata(request);
        if (metadata != null && !metadata.isEmpty()) {
            metadataJson.putAll(metadata);
        }
        return new AiSdkMessage()
                .setId(UUIDGenerator.generate())
                .setConversationId(conversationId)
                .setRole(role)
                .setContent(content)
                .setStatus(status)
                .setSkillIdsJson(JSONObject.toJSONString(request.getSkillIds()))
                .setModelId(app.getModelId())
                .setMetadataJson(metadataJson.toJSONString())
                .setCreateTime(new Date());
    }

    private JSONObject buildConversationMetadata(AppDebugParams request) {
        JSONObject metadata = new JSONObject();
        metadata.put("topicId", request.getTopicId());
        metadata.put("enableSearch", Boolean.TRUE.equals(request.getEnableSearch()));
        metadata.put("sessionType", request.getSessionType());
        metadata.put("skillIds", request.getSkillIds());
        metadata.put("attachments", request.getAttachments());
        return metadata;
    }

    private JSONObject mergeConversationMetadata(String metadataJson, JSONObject update) {
        JSONObject metadata = parseMetadataObject(metadataJson);
        if (update != null && !update.isEmpty()) {
            metadata.putAll(update);
        }
        return metadata;
    }

    private JSONObject buildConversationMetadata(AiSdkConversationCreateParams params) {
        JSONObject metadata = new JSONObject();
        metadata.put("skillIds", params.getSkillIds());
        return metadata;
    }

    private JSONObject buildMessageMetadata(AppDebugParams request) {
        JSONObject metadata = new JSONObject();
        metadata.put("topicId", request.getTopicId());
        metadata.put("enableSearch", Boolean.TRUE.equals(request.getEnableSearch()));
        metadata.put("skillIds", request.getSkillIds());
        metadata.put("attachments", request.getAttachments());
        return metadata;
    }

    private Map<String, String> buildAiSdkContextBaseMetadata(String conversationId, HttpServletRequest httpRequest) {
        Map<String, String> metadata = new HashMap<>();
        AiSdkConversation conversation = getById(conversationId);
        if (conversation != null) {
            metadata.put(EmbeddingHandler.EMBED_STORE_METADATA_SESSION_TYPE, oConvertUtils.getString(conversation.getSessionType()));
            metadata.put(EmbeddingHandler.EMBED_STORE_METADATA_USER_ID, oConvertUtils.getString(conversation.getUserId()));
        }
        metadata.put(EmbeddingHandler.EMBED_STORE_METADATA_TENANT_ID, oConvertUtils.getString(TokenUtils.getTenantIdByRequest(httpRequest)));
        LoginUser loginUser = getLoginUser();
        if (loginUser != null) {
            metadata.put(EmbeddingHandler.EMBED_STORE_METADATA_USER_NAME, oConvertUtils.getString(loginUser.getUsername()));
        }
        return metadata;
    }

    private Map<String, String> buildAiSdkContextBaseMetadata(AiSdkConversation conversation) {
        Map<String, String> metadata = new HashMap<>();
        metadata.put(EmbeddingHandler.EMBED_STORE_METADATA_SESSION_TYPE, oConvertUtils.getString(conversation.getSessionType()));
        metadata.put(EmbeddingHandler.EMBED_STORE_METADATA_USER_ID, oConvertUtils.getString(conversation.getUserId()));
        metadata.put(EmbeddingHandler.EMBED_STORE_METADATA_TENANT_ID, oConvertUtils.getString(conversation.getTenantId()));
        metadata.put(EmbeddingHandler.EMBED_STORE_METADATA_USER_NAME, oConvertUtils.getString(conversation.getUsername()));
        return metadata;
    }

    private Map<String, Object> buildSummaryContext(AiSdkConversation conversation) {
        Map<String, Object> summary = new HashMap<>();
        boolean hasActiveSnapshot = oConvertUtils.isNotEmpty(conversation.getActiveContextSnapshot());
        summary.put("text", hasActiveSnapshot ? conversation.getActiveContextSnapshot() : oConvertUtils.getString(conversation.getSummary()));
        summary.put("messageId", conversation.getSummaryMessageId());
        summary.put("tokenCount", hasActiveSnapshot ? conversation.getActiveContextTokenCount() : conversation.getSummaryTokenCount());
        summary.put("contextVersion", conversation.getContextVersion());
        JSONObject metadata = parseMetadataObject(conversation.getMetadataJson());
        metadata.put("contextMode", hasActiveSnapshot ? "active_snapshot" : "summary");
        metadata.put("contextVersion", conversation.getContextVersion());
        metadata.put("activeContextTokenCount", conversation.getActiveContextTokenCount());
        summary.put("metadata", metadata);
        return summary;
    }

    private List<Map<String, Object>> buildRecentMessageContext(String conversationId, String currentMessageId) {
        LambdaQueryWrapper<AiSdkMessage> query = new LambdaQueryWrapper<>();
        query.eq(AiSdkMessage::getConversationId, conversationId);
        if (oConvertUtils.isNotEmpty(currentMessageId)) {
            query.ne(AiSdkMessage::getId, currentMessageId);
        }
        query.in(AiSdkMessage::getRole, "user", "assistant");
        query.orderByDesc(AiSdkMessage::getCreateTime);
        query.last("LIMIT " + RECENT_RAW_MESSAGE_COUNT);
        List<AiSdkMessage> messages = aiSdkMessageMapper.selectList(query);
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = messages.size() - 1; i >= 0; i--) {
            result.add(toMessageContext(messages.get(i), 4000));
        }
        return result;
    }

    private List<Map<String, Object>> buildRelevantMessageContext(String conversationId, String currentMessageId, String queryText) {
        List<String> keywords = extractKeywords(queryText);
        if (keywords.isEmpty()) {
            return new ArrayList<>();
        }
        LambdaQueryWrapper<AiSdkMessage> query = new LambdaQueryWrapper<>();
        query.eq(AiSdkMessage::getConversationId, conversationId);
        if (oConvertUtils.isNotEmpty(currentMessageId)) {
            query.ne(AiSdkMessage::getId, currentMessageId);
        }
        query.in(AiSdkMessage::getRole, "user", "assistant");
        query.orderByDesc(AiSdkMessage::getCreateTime);
        query.last("LIMIT 200");
        List<ScoredMessage> scored = new ArrayList<>();
        for (AiSdkMessage message : aiSdkMessageMapper.selectList(query)) {
            int score = scoreMessage(message, keywords);
            if (score > 0) {
                scored.add(new ScoredMessage(message, score));
            }
        }
        scored.sort((a, b) -> {
            int scoreCompare = Integer.compare(b.score, a.score);
            if (scoreCompare != 0) {
                return scoreCompare;
            }
            Date aTime = a.message.getCreateTime();
            Date bTime = b.message.getCreateTime();
            if (aTime == null && bTime == null) return 0;
            if (aTime == null) return 1;
            if (bTime == null) return -1;
            return bTime.compareTo(aTime);
        });
        List<Map<String, Object>> result = new ArrayList<>();
        for (ScoredMessage item : scored.subList(0, Math.min(scored.size(), 8))) {
            Map<String, Object> row = toMessageContext(item.message, 4000);
            row.put("score", item.score);
            row.put("retrieval", "keyword_message");
            result.add(row);
        }
        result.sort((a, b) -> {
            Object aTime = a.get("createTime");
            Object bTime = b.get("createTime");
            if (aTime instanceof Date ad && bTime instanceof Date bd) {
                return ad.compareTo(bd);
            }
            return 0;
        });
        return result;
    }

    private Map<String, Object> toMessageContext(AiSdkMessage message, int contentLimit) {
        Map<String, Object> item = new HashMap<>();
        item.put("id", message.getId());
        item.put("role", message.getRole());
        item.put("content", trimText(message.getContent(), contentLimit));
        item.put("tokenCount", message.getTokenCount());
        item.put("metadata", parseMetadata(message.getMetadataJson()));
        item.put("createTime", message.getCreateTime());
        return item;
    }

    private List<Map<String, Object>> buildRecentFragmentContext(String conversationId, String currentMessageId, String type) {
        LambdaQueryWrapper<AiSdkContextFragment> query = new LambdaQueryWrapper<>();
        query.eq(AiSdkContextFragment::getConversationId, conversationId);
        if (oConvertUtils.isNotEmpty(currentMessageId)) {
            query.ne(AiSdkContextFragment::getMessageId, currentMessageId);
        }
        if (oConvertUtils.isNotEmpty(type)) {
            query.eq(AiSdkContextFragment::getType, type);
        } else {
            query.ne(AiSdkContextFragment::getType, "attachment_summary");
        }
        query.orderByDesc(AiSdkContextFragment::getCreateTime);
        query.last("LIMIT 20");
        List<Map<String, Object>> result = new ArrayList<>();
        for (AiSdkContextFragment fragment : aiSdkContextFragmentMapper.selectList(query)) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", fragment.getId());
            item.put("conversationId", fragment.getConversationId());
            item.put("messageId", fragment.getMessageId());
            item.put("type", fragment.getType());
            item.put("text", fragment.getText());
            item.put("tokenCount", fragment.getTokenCount());
            item.put("metadata", parseMetadata(fragment.getMetadataJson()));
            item.put("createTime", fragment.getCreateTime());
            result.add(item);
        }
        return result;
    }

    private List<Map<String, Object>> buildRelevantFragmentContext(String conversationId, String currentMessageId, String queryText) {
        List<Map<String, Object>> embeddingResult = buildEmbeddingFragmentContext(conversationId, currentMessageId, queryText);
        if (!embeddingResult.isEmpty()) {
            return embeddingResult;
        }
        List<String> keywords = extractKeywords(queryText);
        if (keywords.isEmpty()) {
            return buildRecentFragmentContext(conversationId, currentMessageId, null);
        }
        LambdaQueryWrapper<AiSdkContextFragment> query = new LambdaQueryWrapper<>();
        query.eq(AiSdkContextFragment::getConversationId, conversationId);
        if (oConvertUtils.isNotEmpty(currentMessageId)) {
            query.ne(AiSdkContextFragment::getMessageId, currentMessageId);
        }
        query.ne(AiSdkContextFragment::getType, "attachment_summary");
        query.orderByDesc(AiSdkContextFragment::getCreateTime);
        query.last("LIMIT 200");
        List<ScoredFragment> scored = new ArrayList<>();
        for (AiSdkContextFragment fragment : aiSdkContextFragmentMapper.selectList(query)) {
            int score = scoreFragment(fragment, keywords);
            if (score > 0) {
                scored.add(new ScoredFragment(fragment, score));
            }
        }
        scored.sort((a, b) -> {
            int scoreCompare = Integer.compare(b.score, a.score);
            if (scoreCompare != 0) {
                return scoreCompare;
            }
            Date aTime = a.fragment.getCreateTime();
            Date bTime = b.fragment.getCreateTime();
            if (aTime == null && bTime == null) return 0;
            if (aTime == null) return 1;
            if (bTime == null) return -1;
            return bTime.compareTo(aTime);
        });
        List<Map<String, Object>> result = new ArrayList<>();
        for (ScoredFragment item : scored.subList(0, Math.min(scored.size(), 20))) {
            Map<String, Object> row = toFragmentContext(item.fragment);
            row.put("score", item.score);
            result.add(row);
        }
        if (result.isEmpty()) {
            return buildRecentFragmentContext(conversationId, currentMessageId, null);
        }
        return result;
    }

    private List<Map<String, Object>> buildEmbeddingFragmentContext(String conversationId, String currentMessageId, String queryText) {
        if (!orchestratorProperties.isContextEmbeddingEnabled() || oConvertUtils.isEmpty(queryText)) {
            return new ArrayList<>();
        }
        try {
            List<Map<String, Object>> matches = embeddingHandler.searchAiSdkContextFragments(
                    resolveContextEmbedModelId(),
                    conversationId,
                    queryText,
                    orchestratorProperties.getContextEmbeddingTopNumber(),
                    orchestratorProperties.getContextEmbeddingSimilarity()
            );
            List<Map<String, Object>> result = new ArrayList<>();
            Set<String> seen = new LinkedHashSet<>();
            for (Map<String, Object> match : matches) {
                String fragmentId = oConvertUtils.getString(match.get(EmbeddingHandler.EMBED_STORE_METADATA_FRAGMENT_ID));
                if (oConvertUtils.isEmpty(fragmentId) || !seen.add(fragmentId)) {
                    continue;
                }
                AiSdkContextFragment fragment = aiSdkContextFragmentMapper.selectById(fragmentId);
                if (fragment == null || !conversationId.equals(fragment.getConversationId())) {
                    continue;
                }
                if (oConvertUtils.isNotEmpty(currentMessageId) && currentMessageId.equals(fragment.getMessageId())) {
                    continue;
                }
                if ("attachment_summary".equals(fragment.getType())) {
                    continue;
                }
                Map<String, Object> row = toFragmentContext(fragment);
                row.put("score", match.get("score"));
                row.put("retrieval", "pgvector");
                result.add(row);
            }
            return result;
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private List<Map<String, Object>> buildAttachmentMatchContext(String conversationId, String currentMessageId, String queryText) {
        List<Map<String, Object>> embeddingResult = buildEmbeddingAttachmentContext(conversationId, currentMessageId, queryText);
        if (!embeddingResult.isEmpty()) {
            return embeddingResult;
        }
        List<String> keywords = extractKeywords(queryText);
        if (keywords.isEmpty()) {
            return new ArrayList<>();
        }
        LambdaQueryWrapper<AiSdkContextFragment> query = new LambdaQueryWrapper<>();
        query.eq(AiSdkContextFragment::getConversationId, conversationId);
        query.eq(AiSdkContextFragment::getType, "attachment_summary");
        if (oConvertUtils.isNotEmpty(currentMessageId)) {
            query.ne(AiSdkContextFragment::getMessageId, currentMessageId);
        }
        query.orderByDesc(AiSdkContextFragment::getCreateTime);
        query.last("LIMIT 100");
        List<ScoredFragment> scored = new ArrayList<>();
        for (AiSdkContextFragment fragment : aiSdkContextFragmentMapper.selectList(query)) {
            int score = scoreFragment(fragment, keywords);
            if (score > 0) {
                scored.add(new ScoredFragment(fragment, score));
            }
        }
        scored.sort((a, b) -> Integer.compare(b.score, a.score));
        List<Map<String, Object>> result = new ArrayList<>();
        for (ScoredFragment item : scored.subList(0, Math.min(scored.size(), 10))) {
            Map<String, Object> row = toFragmentContext(item.fragment);
            row.put("score", Math.min(1.0, item.score / 10.0));
            row.put("retrieval", "keyword_attachment");
            result.add(row);
        }
        return result;
    }

    private List<Map<String, Object>> buildEmbeddingAttachmentContext(String conversationId, String currentMessageId, String queryText) {
        if (!orchestratorProperties.isContextEmbeddingEnabled() || oConvertUtils.isEmpty(queryText)) {
            return new ArrayList<>();
        }
        try {
            List<Map<String, Object>> matches = embeddingHandler.searchAiSdkContextFragments(
                    resolveContextEmbedModelId(),
                    conversationId,
                    queryText,
                    orchestratorProperties.getContextEmbeddingTopNumber(),
                    orchestratorProperties.getContextEmbeddingSimilarity()
            );
            List<Map<String, Object>> result = new ArrayList<>();
            Set<String> seen = new LinkedHashSet<>();
            for (Map<String, Object> match : matches) {
                String fragmentId = oConvertUtils.getString(match.get(EmbeddingHandler.EMBED_STORE_METADATA_FRAGMENT_ID));
                if (oConvertUtils.isEmpty(fragmentId) || !seen.add(fragmentId)) {
                    continue;
                }
                AiSdkContextFragment fragment = aiSdkContextFragmentMapper.selectById(fragmentId);
                if (fragment == null || !conversationId.equals(fragment.getConversationId())) {
                    continue;
                }
                if (oConvertUtils.isNotEmpty(currentMessageId) && currentMessageId.equals(fragment.getMessageId())) {
                    continue;
                }
                if (!"attachment_summary".equals(fragment.getType())) {
                    continue;
                }
                Map<String, Object> row = toFragmentContext(fragment);
                row.put("score", match.get("score"));
                row.put("retrieval", "pgvector_attachment");
                result.add(row);
            }
            return result;
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private String resolveContextEmbedModelId() {
        if (oConvertUtils.isNotEmpty(orchestratorProperties.getContextEmbedModelId())) {
            return orchestratorProperties.getContextEmbedModelId();
        }
        LambdaQueryWrapper<AiragModel> query = new LambdaQueryWrapper<>();
        query.eq(AiragModel::getModelType, LLMConsts.MODEL_TYPE_EMBED);
        query.eq(AiragModel::getActivateFlag, 1);
        query.orderByDesc(AiragModel::getUpdateTime);
        query.orderByDesc(AiragModel::getCreateTime);
        query.last("LIMIT 1");
        AiragModel model = airagModelMapper.selectOne(query);
        return model == null ? null : model.getId();
    }

    private List<Map<String, Object>> buildCompactionMessageContext(AiSdkConversation conversation, String currentMessageId) {
        LambdaQueryWrapper<AiSdkMessage> query = new LambdaQueryWrapper<>();
        query.eq(AiSdkMessage::getConversationId, conversation.getId());
        if (oConvertUtils.isNotEmpty(conversation.getSummaryMessageId())) {
            Date summaryTime = findMessageCreateTime(conversation.getSummaryMessageId());
            if (summaryTime != null) {
                query.gt(AiSdkMessage::getCreateTime, summaryTime);
            }
        }
        if (oConvertUtils.isNotEmpty(currentMessageId)) {
            query.ne(AiSdkMessage::getId, currentMessageId);
        }
        query.in(AiSdkMessage::getRole, "user", "assistant");
        query.orderByAsc(AiSdkMessage::getCreateTime);
        query.last("LIMIT 200");
        List<AiSdkMessage> messages = aiSdkMessageMapper.selectList(query);
        if (messages.size() <= RECENT_RAW_MESSAGE_COUNT) {
            return new ArrayList<>();
        }
        int compactableEnd = messages.size() - RECENT_RAW_MESSAGE_COUNT;
        List<AiSdkMessage> compactableMessages = messages.subList(0, compactableEnd);
        if (compactableMessages.size() > COMPACTION_MAX_MESSAGE_COUNT) {
            compactableMessages = compactableMessages.subList(0, COMPACTION_MAX_MESSAGE_COUNT);
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (AiSdkMessage message : compactableMessages) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", message.getId());
            item.put("role", message.getRole());
            item.put("content", trimText(message.getContent(), 6000));
            item.put("tokenCount", message.getTokenCount());
            item.put("metadata", parseMetadata(message.getMetadataJson()));
            item.put("createTime", message.getCreateTime());
            result.add(item);
        }
        return result;
    }

    private List<Map<String, Object>> buildCompactionFragmentContext(String conversationId, List<String> messageIds) {
        if (messageIds == null || messageIds.isEmpty()) {
            return new ArrayList<>();
        }
        LambdaQueryWrapper<AiSdkContextFragment> query = new LambdaQueryWrapper<>();
        query.eq(AiSdkContextFragment::getConversationId, conversationId);
        query.in(AiSdkContextFragment::getMessageId, messageIds);
        query.orderByDesc(AiSdkContextFragment::getCreateTime);
        query.last("LIMIT 80");
        List<Map<String, Object>> result = new ArrayList<>();
        for (AiSdkContextFragment fragment : aiSdkContextFragmentMapper.selectList(query)) {
            result.add(toFragmentContext(fragment));
        }
        return result;
    }

    private Map<String, Object> toFragmentContext(AiSdkContextFragment fragment) {
        Map<String, Object> item = new HashMap<>();
        item.put("id", fragment.getId());
        item.put("conversationId", fragment.getConversationId());
        item.put("messageId", fragment.getMessageId());
        item.put("type", fragment.getType());
        item.put("text", fragment.getText());
        item.put("tokenCount", fragment.getTokenCount());
        item.put("metadata", parseMetadata(fragment.getMetadataJson()));
        item.put("createTime", fragment.getCreateTime());
        item.put("embeddingStatus", fragment.getEmbeddingStatus());
        item.put("embeddingModelId", fragment.getEmbeddingModelId());
        return item;
    }

    private Date findMessageCreateTime(String messageId) {
        if (oConvertUtils.isEmpty(messageId)) {
            return null;
        }
        AiSdkMessage message = aiSdkMessageMapper.selectById(messageId);
        return message == null ? null : message.getCreateTime();
    }

    private List<String> extractKeywords(String text) {
        String normalized = oConvertUtils.getString(text)
                .replaceAll("[^\\p{IsHan}a-zA-Z0-9_\\-]+", " ")
                .trim()
                .toLowerCase();
        if (normalized.isEmpty()) {
            return new ArrayList<>();
        }
        Set<String> keywords = new LinkedHashSet<>();
        for (String token : normalized.split("\\s+")) {
            if (token.length() >= 2) {
                keywords.add(token);
            }
        }
        if (keywords.isEmpty() && normalized.length() >= 2) {
            keywords.add(normalized);
        }
        return new ArrayList<>(keywords);
    }

    private int scoreFragment(AiSdkContextFragment fragment, List<String> keywords) {
        String haystack = (oConvertUtils.getString(fragment.getText()) + " " + oConvertUtils.getString(fragment.getMetadataJson())).toLowerCase();
        int score = 0;
        for (String keyword : keywords) {
            if (haystack.contains(keyword)) {
                score += keyword.length();
            }
        }
        if ("attachment_summary".equals(fragment.getType())) {
            score += 4;
        } else if ("workspace_snapshot".equals(fragment.getType())) {
            score += 6;
        } else if ("build_result".equals(fragment.getType())) {
            score += 5;
        } else if ("file_change".equals(fragment.getType())) {
            score += 5;
        } else if ("preview_url".equals(fragment.getType())) {
            score += 4;
        } else if ("skill_result".equals(fragment.getType())) {
            score += 3;
        } else if ("tool_result".equals(fragment.getType())) {
            score += 2;
        }
        return score;
    }

    private int scoreMessage(AiSdkMessage message, List<String> keywords) {
        String haystack = (oConvertUtils.getString(message.getContent()) + " " + oConvertUtils.getString(message.getMetadataJson())).toLowerCase();
        int score = 0;
        for (String keyword : keywords) {
            if (haystack.contains(keyword)) {
                score += keyword.length();
            }
        }
        if ("user".equals(message.getRole())) {
            score += 2;
        }
        return score;
    }

    private void rebuildContextFragments(AiSdkMessage message) {
        LambdaQueryWrapper<AiSdkContextFragment> deleteQuery = new LambdaQueryWrapper<>();
        deleteQuery.eq(AiSdkContextFragment::getMessageId, message.getId());
        aiSdkContextFragmentMapper.delete(deleteQuery);

        JSONObject metadata = parseMetadataObject(message.getMetadataJson());
        List<AiSdkContextFragment> fragments = new ArrayList<>();
        appendAttachmentFragments(fragments, message, metadata.getJSONArray("attachments"));
        appendToolResultFragments(fragments, message, metadata.getJSONArray("toolResults"));
        appendSourceFragments(fragments, message, metadata.getJSONArray("sources"));
        appendSkillFragments(fragments, message, metadata.getJSONArray("skillEvents"));
        appendContextSelectionFragments(fragments, message, metadata.getJSONArray("contextEvents"));
        appendErrorFragments(fragments, message, metadata.getJSONArray("errors"));
        for (AiSdkContextFragment fragment : fragments) {
            aiSdkContextFragmentMapper.insert(fragment);
        }
    }

    private void appendAttachmentFragments(List<AiSdkContextFragment> fragments, AiSdkMessage message, JSONArray attachments) {
        if (attachments == null || attachments.isEmpty()) {
            return;
        }
        for (Object item : attachments) {
            JSONObject attachment = toJsonObject(item);
            if (attachment == null) {
                continue;
            }
            String name = oConvertUtils.getString(attachment.getString("name"), "未命名文件");
            String type = oConvertUtils.getString(attachment.getString("type"), "unknown");
            String size = oConvertUtils.getString(attachment.get("size"), "unknown");
            String url = oConvertUtils.getString(attachment.getString("url"), attachment.getString("path"));
            String extractedText = oConvertUtils.getString(attachment.getString("extractedText"), attachment.getString("extracted_text"));
            String summary = trimText(extractedText, 1200);
            String text = "用户上传文件：" + name + "，类型=" + type + "，大小=" + size + "，地址=" + url;
            if (oConvertUtils.isNotEmpty(summary)) {
                text += "\n附件摘要：" + summary;
            }
            fragments.add(buildFragment(message, "attachment_summary", text, attachment));
        }
    }

    private void appendToolResultFragments(List<AiSdkContextFragment> fragments, AiSdkMessage message, JSONArray toolResults) {
        if (toolResults == null || toolResults.isEmpty()) {
            return;
        }
        for (Object item : toolResults) {
            JSONObject toolResult = toJsonObject(item);
            if (toolResult == null) {
                continue;
            }
            String toolName = toolResult.getString("toolName");
            if ("web_search".equals(toolName)) {
                continue;
            }
            if (appendBuilderToolResultFragment(fragments, message, toolResult, toolName)) {
                continue;
            }
            String title = oConvertUtils.getString(toolResult.getString("title"), toolName);
            JSONObject result = toolResult.getJSONObject("result");
            String resultText = result == null ? toolResult.toJSONString() : result.toJSONString();
            String text = "工具返回：" + title + "\n工具名称=" + toolName + "\n结果=" + trimText(resultText, 1800);
            fragments.add(buildFragment(message, "tool_result", text, toolResult));
        }
    }

    private boolean appendBuilderToolResultFragment(List<AiSdkContextFragment> fragments, AiSdkMessage message, JSONObject toolResult, String toolName) {
        if (oConvertUtils.isEmpty(toolName) || !toolName.startsWith("builder_")) {
            return false;
        }
        JSONObject result = toolResult.getJSONObject("result");
        if (result == null) {
            result = new JSONObject();
        }
        JSONObject metadata = buildBuilderFragmentMetadata(toolResult, result);
        String type;
        String text;
        switch (toolName) {
            case "builder_create_workspace":
                type = "workspace_snapshot";
                text = buildBuilderWorkspaceText(toolName, result);
                break;
            case "builder_get_snapshot":
                type = "workspace_snapshot";
                text = buildBuilderSnapshotText(toolName, result);
                break;
            case "builder_write_file":
                type = "file_change";
                text = buildBuilderWriteFileText(toolName, result);
                break;
            case "builder_apply_patch":
                type = "file_change";
                text = buildBuilderPatchText(toolName, result);
                break;
            case "builder_build_h5":
                type = "build_result";
                text = buildBuilderBuildText(toolName, result);
                break;
            case "builder_start_preview_h5":
                type = "preview_url";
                text = buildBuilderPreviewText(toolName, result);
                break;
            default:
                type = "tool_result";
                text = "Builder 工具返回：" + toolName + "\n结果=" + trimText(result.toJSONString(), 1800);
                break;
        }
        fragments.add(buildFragment(message, type, text, metadata));
        return true;
    }

    private JSONObject buildBuilderFragmentMetadata(JSONObject toolResult, JSONObject result) {
        JSONObject metadata = new JSONObject();
        String toolName = toolResult.getString("toolName");
        metadata.put("toolName", toolName);
        metadata.put("status", oConvertUtils.getString(toolResult.getString("status"), result.getString("status")));
        metadata.put("title", toolResult.getString("title"));
        metadata.put("toolCallId", toolResult.getString("toolCallId"));
        metadata.put("workspaceId", extractBuilderWorkspaceId(result));
        metadata.put("previewUrl", result.getString("previewUrl"));
        metadata.put("path", result.getString("path"));
        metadata.put("additions", result.getInteger("additions"));
        metadata.put("deletions", result.getInteger("deletions"));
        metadata.put("changedFiles", result.getJSONArray("changedFiles"));
        metadata.put("fileChanges", result.getJSONArray("fileChanges"));
        metadata.put("rawResult", trimText(result.toJSONString(), 2500));
        return metadata;
    }

    private String buildBuilderWorkspaceText(String toolName, JSONObject result) {
        JSONObject workspace = result.getJSONObject("workspace");
        JSONObject snapshot = result.getJSONObject("snapshot");
        String workspaceId = extractBuilderWorkspaceId(result);
        String workspacePath = workspace == null ? "" : oConvertUtils.getString(workspace.getString("path"));
        String templatePath = workspace == null ? "" : oConvertUtils.getString(workspace.getString("templatePath"));
        JSONArray importantFiles = snapshot == null ? null : snapshot.getJSONArray("importantFiles");
        int fileCount = getJsonArraySize(snapshot == null ? null : snapshot.getJSONArray("files"));
        String text = "Builder 工作区已创建：workspaceId=" + workspaceId;
        if (oConvertUtils.isNotEmpty(workspacePath)) {
            text += "\n工作区路径：" + workspacePath;
        }
        if (oConvertUtils.isNotEmpty(templatePath)) {
            text += "\n模板路径：" + templatePath;
        }
        text += "\n文件数量=" + fileCount + "\n重要文件：" + formatJsonArray(importantFiles);
        return text + "\n工具名称=" + toolName;
    }

    private String buildBuilderSnapshotText(String toolName, JSONObject result) {
        JSONObject snapshot = result.getJSONObject("snapshot");
        if (snapshot == null) {
            snapshot = result;
        }
        String workspaceId = extractBuilderWorkspaceId(result);
        int fileCount = getJsonArraySize(snapshot.getJSONArray("files"));
        JSONArray importantFiles = snapshot.getJSONArray("importantFiles");
        String root = oConvertUtils.getString(snapshot.getString("root"));
        String text = "Builder 工作区快照：workspaceId=" + workspaceId + "\n文件数量=" + fileCount;
        if (oConvertUtils.isNotEmpty(root)) {
            text += "\n工作区根目录：" + root;
        }
        text += "\n重要文件：" + formatJsonArray(importantFiles);
        return text + "\n工具名称=" + toolName;
    }

    private String buildBuilderWriteFileText(String toolName, JSONObject result) {
        String workspaceId = extractBuilderWorkspaceId(result);
        String path = oConvertUtils.getString(result.getString("path"));
        String bytesWritten = oConvertUtils.getString(result.get("bytesWritten"));
        String additions = oConvertUtils.getString(result.get("additions"));
        String deletions = oConvertUtils.getString(result.get("deletions"));
        return "Builder 文件已写入：workspaceId=" + workspaceId
                + "\n文件路径：" + path
                + "\n写入字节数=" + bytesWritten
                + "\n变更行数：+" + additions + " -" + deletions
                + "\n工具名称=" + toolName;
    }

    private String buildBuilderPatchText(String toolName, JSONObject result) {
        String workspaceId = extractBuilderWorkspaceId(result);
        String text = "Builder 补丁已应用：workspaceId=" + workspaceId
                + "\n变更文件：" + formatJsonArray(result.getJSONArray("changedFiles"))
                + "\n文件变更：" + formatJsonArray(result.getJSONArray("fileChanges"));
        String stdout = oConvertUtils.getString(result.getString("stdout"));
        String stderr = oConvertUtils.getString(result.getString("stderr"));
        if (oConvertUtils.isNotEmpty(stdout)) {
            text += "\nstdout：" + trimText(stdout, 900);
        }
        if (oConvertUtils.isNotEmpty(stderr)) {
            text += "\nstderr：" + trimText(stderr, 900);
        }
        return text + "\n工具名称=" + toolName;
    }

    private String buildBuilderBuildText(String toolName, JSONObject result) {
        String workspaceId = extractBuilderWorkspaceId(result);
        String status = oConvertUtils.getString(result.getString("status"));
        String exitCode = oConvertUtils.getString(result.get("exitCode"));
        String command = result.getJSONArray("command") == null ? oConvertUtils.getString(result.getString("command")) : result.getJSONArray("command").toJSONString();
        String text = "Builder H5 构建结果：workspaceId=" + workspaceId
                + "\n状态=" + status
                + "，exitCode=" + exitCode
                + "\n命令=" + command;
        String stdout = oConvertUtils.getString(result.getString("stdout"));
        String stderr = oConvertUtils.getString(result.getString("stderr"));
        if (oConvertUtils.isNotEmpty(stdout)) {
            text += "\nstdout：" + trimText(stdout, 1200);
        }
        if (oConvertUtils.isNotEmpty(stderr)) {
            text += "\nstderr：" + trimText(stderr, 1200);
        }
        return text + "\n工具名称=" + toolName;
    }

    private String buildBuilderPreviewText(String toolName, JSONObject result) {
        String workspaceId = extractBuilderWorkspaceId(result);
        String status = oConvertUtils.getString(result.getString("status"));
        String previewUrl = oConvertUtils.getString(result.getString("previewUrl"));
        String port = oConvertUtils.getString(result.get("port"));
        String log = oConvertUtils.getString(result.getString("log"));
        String text = "Builder H5 预览已启动：workspaceId=" + workspaceId
                + "\n状态=" + status
                + "\n预览地址=" + previewUrl
                + "\n端口=" + port;
        if (oConvertUtils.isNotEmpty(log)) {
            text += "\n日志：" + trimText(log, 900);
        }
        return text + "\n工具名称=" + toolName;
    }

    private String extractBuilderWorkspaceId(JSONObject result) {
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
            if (oConvertUtils.isNotEmpty(workspaceId)) {
                return workspaceId;
            }
        }
        return "";
    }

    private int getJsonArraySize(JSONArray array) {
        return array == null ? 0 : array.size();
    }

    private String formatJsonArray(JSONArray array) {
        if (array == null || array.isEmpty()) {
            return "[]";
        }
        return trimText(array.toJSONString(), 1000);
    }

    private void appendSourceFragments(List<AiSdkContextFragment> fragments, AiSdkMessage message, JSONArray sources) {
        if (sources == null || sources.isEmpty()) {
            return;
        }
        for (Object item : sources) {
            JSONObject source = toJsonObject(item);
            if (source == null) {
                continue;
            }
            String title = oConvertUtils.getString(source.getString("title"), "未命名来源");
            String url = oConvertUtils.getString(source.getString("url"));
            String snippet = oConvertUtils.getString(source.getString("snippet"), source.getString("content"));
            String text = "联网搜索来源：标题=" + title + "，URL=" + url;
            if (oConvertUtils.isNotEmpty(snippet)) {
                text += "\n摘要：" + trimText(snippet, 1200);
            }
            fragments.add(buildFragment(message, "source", text, source));
        }
    }

    private void appendSkillFragments(List<AiSdkContextFragment> fragments, AiSdkMessage message, JSONArray skillEvents) {
        if (skillEvents == null || skillEvents.isEmpty()) {
            return;
        }
        for (Object item : skillEvents) {
            JSONObject skillEvent = toJsonObject(item);
            if (skillEvent == null) {
                continue;
            }
            String event = skillEvent.getString("event");
            if (!"SPEC_EVENT".equals(event) && !"SKILL_SELECTED".equals(event)) {
                continue;
            }
            String status = skillEvent.getString("status");
            String stage = skillEvent.getString("stage");
            if ("SPEC_EVENT".equals(event) && !"completed".equals(stage) && !"completed".equals(status)) {
                continue;
            }
            String skillName = oConvertUtils.getString(skillEvent.getString("skillName"), skillEvent.getString("skillId"));
            String messageText = oConvertUtils.getString(skillEvent.getString("message"), skillEvent.getString("description"));
            String resultText = skillEvent.get("result") == null ? "" : JSONObject.toJSONString(skillEvent.get("result"));
            String text = "Skill 执行结果：" + skillName;
            if (oConvertUtils.isNotEmpty(stage)) {
                text += "，阶段=" + stage;
            }
            if (oConvertUtils.isNotEmpty(status)) {
                text += "，状态=" + status;
            }
            if (oConvertUtils.isNotEmpty(messageText)) {
                text += "\n说明：" + messageText;
            }
            if (oConvertUtils.isNotEmpty(resultText)) {
                text += "\n结果：" + trimText(resultText, 1600);
            }
            fragments.add(buildFragment(message, "skill_result", text, skillEvent));
        }
    }

    private void appendErrorFragments(List<AiSdkContextFragment> fragments, AiSdkMessage message, JSONArray errors) {
        if (errors == null || errors.isEmpty()) {
            return;
        }
        for (Object item : errors) {
            JSONObject error = toJsonObject(item);
            if (error == null) {
                continue;
            }
            String text = "执行错误：" + oConvertUtils.getString(error.getString("message"), error.toJSONString());
            fragments.add(buildFragment(message, "error", text, error));
        }
    }

    private void appendContextSelectionFragments(List<AiSdkContextFragment> fragments, AiSdkMessage message, JSONArray contextEvents) {
        if (contextEvents == null || contextEvents.isEmpty()) {
            return;
        }
        for (Object item : contextEvents) {
            JSONObject contextEvent = toJsonObject(item);
            if (contextEvent == null) {
                continue;
            }
            JSONObject selection = contextEvent.getJSONObject("attachmentSelection");
            JSONObject contextSelection = contextEvent.getJSONObject("contextSelection");
            if (selection == null) {
                selection = contextEvent.getJSONObject("data");
                if (selection != null) {
                    contextSelection = selection.getJSONObject("contextSelection");
                    selection = selection.getJSONObject("attachmentSelection");
                }
            }
            if (selection == null && contextSelection == null) {
                continue;
            }
            JSONObject ledger = contextSelection == null ? null : contextSelection.getJSONObject("tokenLedger");
            String text = "上下文选择：";
            if (ledger != null) {
                text += "selectedFragmentCount=" + oConvertUtils.getString(ledger.get("selectedFragmentCount"))
                        + "，selectedRecentMessageCount=" + oConvertUtils.getString(ledger.get("selectedRecentMessageCount"))
                        + "，estimatedContextInputTokens=" + oConvertUtils.getString(ledger.get("estimatedContextInputTokens"));
            }
            if (selection != null) {
                text += "\n附件选择：includeAttachments=" + selection.getBooleanValue("includeAttachments")
                        + "，reason=" + oConvertUtils.getString(selection.getString("reason"))
                        + "，candidateCount=" + oConvertUtils.getString(selection.get("candidateCount"))
                        + "，selectedTokenCount=" + oConvertUtils.getString(selection.get("selectedTokenCount"));
            }
            JSONArray targetFiles = selection == null ? null : selection.getJSONArray("targetFiles");
            if (targetFiles != null && !targetFiles.isEmpty()) {
                text += "\n选中文件：" + targetFiles.toJSONString();
            }
            JSONObject metadata = contextSelection == null ? new JSONObject() : contextSelection;
            if (selection != null) {
                metadata.put("attachmentSelection", selection);
            }
            fragments.add(buildFragment(message, "context_selection", text, metadata));
        }
    }

    private AiSdkContextFragment buildFragment(AiSdkMessage message, String type, String text, JSONObject metadata) {
        String content = trimText(oConvertUtils.getString(text), 4000);
        return new AiSdkContextFragment()
                .setId(UUIDGenerator.generate())
                .setConversationId(message.getConversationId())
                .setMessageId(message.getId())
                .setType(type)
                .setText(content)
                .setTokenCount(estimateTokenCount(content))
                .setEmbeddingStatus("pending")
                .setMetadataJson(metadata == null ? null : metadata.toJSONString())
                .setCreateTime(new Date());
    }

    private JSONObject parseMetadataObject(String metadataJson) {
        if (oConvertUtils.isEmpty(metadataJson)) {
            return new JSONObject();
        }
        try {
            return JSONObject.parseObject(metadataJson);
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private Integer getLedgerInteger(JSONObject ledger, String key) {
        if (ledger == null || !ledger.containsKey(key)) {
            return 0;
        }
        return oConvertUtils.getInt(ledger.get(key), 0);
    }

    private JSONObject toJsonObject(Object item) {
        if (item instanceof JSONObject object) {
            return object;
        }
        if (item instanceof Map<?, ?> map) {
            JSONObject object = new JSONObject();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (entry.getKey() != null) {
                    object.put(String.valueOf(entry.getKey()), entry.getValue());
                }
            }
            return object;
        }
        return null;
    }

    private String trimText(String text, int limit) {
        String value = oConvertUtils.getString(text).replaceAll("\\s+", " ").trim();
        if (value.length() <= limit) {
            return value;
        }
        return value.substring(0, limit) + "...";
    }

    private int estimateTokenCount(String text) {
        String value = oConvertUtils.getString(text);
        if (value.isEmpty()) {
            return 0;
        }
        int ascii = 0;
        int nonAscii = 0;
        for (int i = 0; i < value.length(); i++) {
            if (value.charAt(i) < 128) {
                ascii++;
            } else {
                nonAscii++;
            }
        }
        return Math.max(1, (int) Math.ceil(ascii / 4.0 + nonAscii / 1.5));
    }

    private void touchConversation(String conversationId) {
        AiSdkConversation conversation = new AiSdkConversation()
                .setId(conversationId)
                .setUpdateTime(new Date());
        updateById(conversation);
    }

    private String buildTitle(String content) {
        String text = oConvertUtils.getString(content).replaceAll("\\s+", " ").trim();
        if (text.length() > 18) {
            return text.substring(0, 18) + "...";
        }
        return oConvertUtils.getString(text, "新建对话");
    }

    private void appendOwnerCondition(LambdaQueryWrapper<AiSdkConversation> query, HttpServletRequest httpRequest) {
        LoginUser loginUser = getLoginUser();
        if (loginUser != null && oConvertUtils.isNotEmpty(loginUser.getId())) {
            query.eq(AiSdkConversation::getUserId, loginUser.getId());
        }
        String tenantId = TokenUtils.getTenantIdByRequest(httpRequest);
        if (oConvertUtils.isNotEmpty(tenantId)) {
            query.eq(AiSdkConversation::getTenantId, tenantId);
        }
    }

    private AiSdkConversation assertConversationOwner(String conversationId, HttpServletRequest httpRequest) {
        AssertUtils.assertNotEmpty("请选择会话", conversationId);
        LambdaQueryWrapper<AiSdkConversation> query = new LambdaQueryWrapper<>();
        query.eq(AiSdkConversation::getId, conversationId);
        appendOwnerCondition(query, httpRequest);
        AiSdkConversation conversation = getOne(query, false);
        if (conversation == null) {
            throw new JeecgBootException("会话不存在或无权访问");
        }
        return conversation;
    }

    private AiSdkConversationVo toConversationVo(AiSdkConversation conversation) {
        AiSdkConversationVo vo = new AiSdkConversationVo();
        vo.setId(conversation.getId());
        vo.setTitle(conversation.getTitle());
        vo.setAppId(conversation.getAppId());
        vo.setAppName(conversation.getAppName());
        vo.setModelId(conversation.getModelId());
        vo.setSessionType(conversation.getSessionType());
        vo.setSkillIds(parseSkillIdsFromMetadata(conversation.getMetadataJson()));
        vo.setCreateTime(conversation.getCreateTime());
        vo.setUpdateTime(conversation.getUpdateTime());
        return vo;
    }

    private AiSdkMessageVo toMessageVo(AiSdkMessage message) {
        AiSdkMessageVo vo = new AiSdkMessageVo();
        vo.setId(message.getId());
        vo.setConversationId(message.getConversationId());
        vo.setRole(message.getRole());
        vo.setContent(message.getContent());
        vo.setStatus(message.getStatus());
        vo.setModelId(message.getModelId());
        vo.setSkillIds(parseSkillIds(message.getSkillIdsJson()));
        vo.setMetadata(parseMetadata(message.getMetadataJson()));
        vo.setCreateTime(message.getCreateTime());
        return vo;
    }

    private void attachRunEvents(String conversationId, List<AiSdkMessageVo> messages) {
        List<String> assistantMessageIds = new ArrayList<>();
        for (AiSdkMessageVo message : messages) {
            if ("assistant".equals(message.getRole()) && oConvertUtils.isNotEmpty(message.getId())) {
                assistantMessageIds.add(message.getId());
            }
        }
        if (assistantMessageIds.isEmpty()) {
            return;
        }

        LambdaQueryWrapper<AiSdkRun> runQuery = new LambdaQueryWrapper<>();
        runQuery.eq(AiSdkRun::getConversationId, conversationId);
        runQuery.in(AiSdkRun::getAssistantMessageId, assistantMessageIds);
        List<AiSdkRun> runs = aiSdkRunMapper.selectList(runQuery);
        if (runs.isEmpty()) {
            return;
        }

        Map<String, String> messageRunIds = new HashMap<>();
        List<String> runIds = new ArrayList<>();
        for (AiSdkRun run : runs) {
            if (oConvertUtils.isEmpty(run.getAssistantMessageId()) || oConvertUtils.isEmpty(run.getId())) {
                continue;
            }
            messageRunIds.put(run.getAssistantMessageId(), run.getId());
            runIds.add(run.getId());
        }
        if (runIds.isEmpty()) {
            return;
        }

        LambdaQueryWrapper<AiSdkRunEvent> eventQuery = new LambdaQueryWrapper<>();
        eventQuery.eq(AiSdkRunEvent::getConversationId, conversationId);
        eventQuery.in(AiSdkRunEvent::getRunId, runIds);
        eventQuery.orderByAsc(AiSdkRunEvent::getSequence);
        Map<String, List<AiSdkRunEventVo>> eventsByRunId = new HashMap<>();
        for (AiSdkRunEvent event : aiSdkRunEventMapper.selectList(eventQuery)) {
            eventsByRunId.computeIfAbsent(event.getRunId(), key -> new ArrayList<>()).add(toRunEventVo(event));
        }

        for (AiSdkMessageVo message : messages) {
            String runId = messageRunIds.get(message.getId());
            if (oConvertUtils.isNotEmpty(runId)) {
                message.setRunEvents(eventsByRunId.getOrDefault(runId, new ArrayList<>()));
            }
        }
    }

    private AiSdkRunEventVo toRunEventVo(AiSdkRunEvent event) {
        AiSdkRunEventVo vo = new AiSdkRunEventVo();
        vo.setId(event.getId());
        vo.setRunId(event.getRunId());
        vo.setConversationId(event.getConversationId());
        vo.setSequence(event.getSequence());
        vo.setEventType(event.getEventType());
        vo.setPhase(event.getPhase());
        vo.setStatus(event.getStatus());
        vo.setPayload(parseMetadata(event.getPayloadJson()));
        vo.setCreateTime(event.getCreateTime());
        return vo;
    }

    private List<String> parseSkillIdsFromMetadata(String metadataJson) {
        Map<String, Object> metadata = parseMetadata(metadataJson);
        Object skillIds = metadata.get("skillIds");
        if (!(skillIds instanceof List<?> list)) {
            return new ArrayList<>();
        }
        List<String> result = new ArrayList<>();
        for (Object item : list) {
            if (item != null) {
                result.add(String.valueOf(item));
            }
        }
        return result;
    }

    private List<String> parseSkillIds(String skillIdsJson) {
        if (oConvertUtils.isEmpty(skillIdsJson)) {
            return new ArrayList<>();
        }
        try {
            return JSONObject.parseObject(skillIdsJson, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private List<Map<String, Object>> parseAttachmentsFromMetadata(String metadataJson) {
        Map<String, Object> metadata = parseMetadata(metadataJson);
        Object attachments = metadata.get("attachments");
        if (!(attachments instanceof List<?> list)) {
            return new ArrayList<>();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> map)) {
                continue;
            }
            if (!hasReadableAttachmentLocation(map)) {
                continue;
            }
            Map<String, Object> attachment = new HashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (entry.getKey() != null) {
                    attachment.put(String.valueOf(entry.getKey()), entry.getValue());
                }
            }
            result.add(attachment);
        }
        return result;
    }

    private boolean hasReadableAttachmentLocation(Map<?, ?> attachment) {
        Object url = attachment.get("url");
        Object path = attachment.get("path");
        return oConvertUtils.isNotEmpty(url) || oConvertUtils.isNotEmpty(path);
    }

    private Map<String, Object> parseMetadata(String metadataJson) {
        if (oConvertUtils.isEmpty(metadataJson)) {
            return new HashMap<>();
        }
        try {
            return JSONObject.parseObject(metadataJson);
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    private LoginUser getLoginUser() {
        try {
            Object principal = SecurityUtils.getSubject().getPrincipal();
            return principal instanceof LoginUser ? (LoginUser) principal : null;
        } catch (Exception e) {
            return null;
        }
    }

    private static class ScoredFragment {
        private final AiSdkContextFragment fragment;
        private final int score;

        private ScoredFragment(AiSdkContextFragment fragment, int score) {
            this.fragment = fragment;
            this.score = score;
        }
    }

    private static class ScoredMessage {
        private final AiSdkMessage message;
        private final int score;

        private ScoredMessage(AiSdkMessage message, int score) {
            this.message = message;
            this.score = score;
        }
    }
}
