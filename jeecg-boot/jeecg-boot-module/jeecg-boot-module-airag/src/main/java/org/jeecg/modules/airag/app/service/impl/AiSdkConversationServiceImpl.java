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
import org.jeecg.modules.airag.app.entity.AiSdkConversation;
import org.jeecg.modules.airag.app.entity.AiSdkContextFragment;
import org.jeecg.modules.airag.app.entity.AiSdkMessage;
import org.jeecg.modules.airag.app.entity.AiragApp;
import org.jeecg.modules.airag.app.mapper.AiSdkConversationMapper;
import org.jeecg.modules.airag.app.mapper.AiSdkContextFragmentMapper;
import org.jeecg.modules.airag.app.mapper.AiSdkMessageMapper;
import org.jeecg.modules.airag.app.service.IAiSdkConversationService;
import org.jeecg.modules.airag.app.vo.AiSdkConversationCreateParams;
import org.jeecg.modules.airag.app.vo.AiSdkConversationRenameParams;
import org.jeecg.modules.airag.app.vo.AiSdkConversationVo;
import org.jeecg.modules.airag.app.vo.AiSdkMessageVo;
import org.jeecg.modules.airag.app.vo.AppDebugParams;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * AI SDK 会话服务实现
 */
@Service
public class AiSdkConversationServiceImpl extends ServiceImpl<AiSdkConversationMapper, AiSdkConversation> implements IAiSdkConversationService {

    private static final String DEFAULT_SESSION_TYPE = "ai-sdk-chat";
    private static final String MESSAGE_STATUS_COMPLETED = "completed";

    @Autowired
    private AiSdkMessageMapper aiSdkMessageMapper;

    @Autowired
    private AiSdkContextFragmentMapper aiSdkContextFragmentMapper;

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
                .setMetadataJson(buildConversationMetadata(request).toJSONString())
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
    public Map<String, Object> buildContextSource(String conversationId, String currentMessageId, HttpServletRequest httpRequest) {
        AiSdkConversation conversation = assertConversationOwner(conversationId, httpRequest);
        Map<String, Object> contextSource = new HashMap<>();
        contextSource.put("summary", buildSummaryContext(conversation));
        contextSource.put("recent_messages", buildRecentMessageContext(conversationId, currentMessageId));
        contextSource.put("relevant_fragments", buildRecentFragmentContext(conversationId, currentMessageId, null));
        contextSource.put("attachment_summaries", buildRecentFragmentContext(conversationId, currentMessageId, "attachment_summary"));
        return contextSource;
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
        List<AiSdkMessageVo> result = new ArrayList<>();
        for (AiSdkMessage message : aiSdkMessageMapper.selectList(query)) {
            result.add(toMessageVo(message));
        }
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
        LambdaQueryWrapper<AiSdkContextFragment> fragmentQuery = new LambdaQueryWrapper<>();
        fragmentQuery.eq(AiSdkContextFragment::getConversationId, conversationId);
        aiSdkContextFragmentMapper.delete(fragmentQuery);
        LambdaQueryWrapper<AiSdkMessage> messageQuery = new LambdaQueryWrapper<>();
        messageQuery.eq(AiSdkMessage::getConversationId, conversationId);
        aiSdkMessageMapper.delete(messageQuery);
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

    private Map<String, Object> buildSummaryContext(AiSdkConversation conversation) {
        Map<String, Object> summary = new HashMap<>();
        summary.put("text", oConvertUtils.getString(conversation.getSummary()));
        summary.put("messageId", conversation.getSummaryMessageId());
        summary.put("tokenCount", conversation.getSummaryTokenCount());
        summary.put("metadata", parseMetadata(conversation.getMetadataJson()));
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
        query.last("LIMIT 12");
        List<AiSdkMessage> messages = aiSdkMessageMapper.selectList(query);
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = messages.size() - 1; i >= 0; i--) {
            AiSdkMessage message = messages.get(i);
            Map<String, Object> item = new HashMap<>();
            item.put("id", message.getId());
            item.put("role", message.getRole());
            item.put("content", trimText(message.getContent(), 4000));
            item.put("tokenCount", message.getTokenCount());
            item.put("metadata", parseMetadata(message.getMetadataJson()));
            item.put("createTime", message.getCreateTime());
            result.add(item);
        }
        return result;
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
            String title = oConvertUtils.getString(toolResult.getString("title"), toolName);
            JSONObject result = toolResult.getJSONObject("result");
            String resultText = result == null ? toolResult.toJSONString() : result.toJSONString();
            String text = "工具返回：" + title + "\n工具名称=" + toolName + "\n结果=" + trimText(resultText, 1800);
            fragments.add(buildFragment(message, "tool_result", text, toolResult));
        }
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

    private AiSdkContextFragment buildFragment(AiSdkMessage message, String type, String text, JSONObject metadata) {
        String content = trimText(oConvertUtils.getString(text), 4000);
        return new AiSdkContextFragment()
                .setId(UUIDGenerator.generate())
                .setConversationId(message.getConversationId())
                .setMessageId(message.getId())
                .setType(type)
                .setText(content)
                .setTokenCount(estimateTokenCount(content))
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
}
