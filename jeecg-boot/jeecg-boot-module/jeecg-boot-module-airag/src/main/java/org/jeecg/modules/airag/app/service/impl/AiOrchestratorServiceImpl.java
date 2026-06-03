package org.jeecg.modules.airag.app.service.impl;

import com.alibaba.fastjson.JSONObject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.shiro.SecurityUtils;
import org.jeecg.common.exception.JeecgBootException;
import org.jeecg.common.system.vo.LoginUser;
import org.jeecg.common.util.AssertUtils;
import org.jeecg.common.util.TokenUtils;
import org.jeecg.modules.airag.app.config.AiOrchestratorProperties;
import org.jeecg.modules.airag.app.entity.AiSdkConversation;
import org.jeecg.modules.airag.app.entity.AiSdkMessage;
import org.jeecg.modules.airag.app.entity.AiragApp;
import org.jeecg.modules.airag.app.service.IAiOrchestratorService;
import org.jeecg.modules.airag.app.service.IAiSdkConversationService;
import org.jeecg.modules.airag.app.service.IAiragAppService;
import org.jeecg.modules.airag.app.vo.AppDebugParams;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
public class AiOrchestratorServiceImpl implements IAiOrchestratorService {
    private static final ExecutorService CONTEXT_POST_PROCESSOR = Executors.newFixedThreadPool(2);

    @Autowired
    private IAiragAppService airagAppService;

    @Autowired
    private AiOrchestratorProperties properties;

    @Autowired
    private IAiSdkConversationService aiSdkConversationService;

    @Override
    public void debug(AppDebugParams request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        chatStream(request, httpRequest, httpResponse);
    }

    @Override
    public void chatStream(AppDebugParams request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        AssertUtils.assertNotEmpty("请输入运行内容", request.getContent());
        AiragApp app = resolveApp(request);
        proxyChatStream(app, request, httpRequest, httpResponse);
    }

    @Override
    public String skills() {
        HttpURLConnection connection = null;
        try {
            connection = openGetConnection("/api/skills");
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                throw new IOException("ai-orchestrator HTTP " + status + readErrorBody(connection));
            }
            return readBody(connection.getInputStream());
        } catch (Exception e) {
            log.error("ai-orchestrator Skills 代理失败", e);
            JSONObject error = new JSONObject();
            error.put("skills", new Object[0]);
            error.put("message", "ai-orchestrator Skills 调用失败：" + e.getMessage());
            return error.toJSONString();
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private AiragApp resolveApp(AppDebugParams request) {
        AiragApp app = request.getApp();
        if (app == null && request.getAppId() != null) {
            app = airagAppService.getById(request.getAppId());
        }
        if (app == null && request.getModelId() != null) {
            app = buildAiSdkDefaultApp(request);
        }
        if (app == null) {
            throw new JeecgBootException("AI应用配置不能为空");
        }
        if (request.getModelId() != null) {
            app.setModelId(request.getModelId());
        }
        return app;
    }

    private AiragApp buildAiSdkDefaultApp(AppDebugParams request) {
        return new AiragApp()
                .setId("ai-sdk-dev")
                .setName("JeecgBoot AI 助手")
                .setType("chatSimple")
                .setPrompt("你是 JeecgBoot AI 应用开发助手，请结合用户需求给出可执行的开发建议。")
                .setModelId(request.getModelId());
    }

    private void proxyChatStream(AiragApp app, AppDebugParams request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String requestId = UUID.randomUUID().toString();
        AiSdkConversation conversation = aiSdkConversationService.ensureConversation(app, request, httpRequest);
        AiSdkMessage userMessage = aiSdkConversationService.saveUserMessage(conversation, app, request);
        String conversationId = conversation.getId();
        Map<String, Object> contextSource = aiSdkConversationService.buildContextSource(conversationId, userMessage.getId(), request.getContent(), httpRequest);
        String topicId = request.getTopicId() == null ? "" : request.getTopicId();
        HttpURLConnection connection = null;
        boolean forwarded = false;
        boolean assistantSaved = false;
        StringBuilder assistantContent = new StringBuilder();
        AssistantSseMetadataCollector metadataCollector = new AssistantSseMetadataCollector(app, request);
        prepareSseResponse(httpResponse);
        try {
            connection = openConnection("/api/apps/chat/stream");
            try (OutputStream outputStream = connection.getOutputStream()) {
                outputStream.write(buildChatPayload(app, request, httpRequest, contextSource).toJSONString().getBytes(StandardCharsets.UTF_8));
            }

            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                throw new IOException("ai-orchestrator HTTP " + status + readErrorBody(connection));
            }

            PrintWriter writer = httpResponse.getWriter();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                StringBuilder event = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.isEmpty()) {
                        ForwardedEvent forwardedEvent = forwardEvent(writer, event.toString());
                        forwarded = forwardedEvent.forwarded || forwarded;
                        assistantSaved = handleForwardedEvent(forwardedEvent.eventData, assistantContent, assistantSaved, conversationId, app, request, metadataCollector);
                        event.setLength(0);
                    } else {
                        event.append(line).append('\n');
                    }
                }
                ForwardedEvent forwardedEvent = forwardEvent(writer, event.toString());
                forwarded = forwardedEvent.forwarded || forwarded;
                assistantSaved = handleForwardedEvent(forwardedEvent.eventData, assistantContent, assistantSaved, conversationId, app, request, metadataCollector);
            }
            if (!forwarded) {
                JSONObject message = new JSONObject();
                message.put("message", "ai-orchestrator 没有返回有效 SSE 事件");
                sendEvent(writer, buildEvent(requestId, "ERROR", message, conversationId, topicId));
                metadataCollector.recordGeneratedError(message);
                aiSdkConversationService.saveAssistantMessage(conversationId, message.getString("message"), "failed", app, request, metadataCollector.toMetadata());
                assistantSaved = true;
            }
            if (!assistantSaved && assistantContent.length() > 0) {
                aiSdkConversationService.saveAssistantMessage(conversationId, assistantContent.toString(), "completed", app, request, metadataCollector.toMetadata());
            }
            runContextPostProcessing(app, request, conversationId, userMessage.getId(), httpRequest);
        } catch (Exception e) {
            if (isClientAbortException(e)) {
                log.info("AI SDK SSE 客户端已停止响应，conversationId={}", conversationId);
                if (assistantContent.length() > 0) {
                    aiSdkConversationService.saveAssistantMessage(conversationId, assistantContent.toString(), "completed", app, request, metadataCollector.toMetadata());
                    runContextPostProcessing(app, request, conversationId, userMessage.getId(), httpRequest);
                }
                return;
            }
            log.error("ai-orchestrator SSE 代理失败", e);
            try {
                JSONObject message = new JSONObject();
                message.put("message", "ai-orchestrator 调用失败：" + e.getMessage());
                sendEvent(httpResponse.getWriter(), buildEvent(requestId, "ERROR", message, conversationId, topicId));
                String failedContent = assistantContent.length() > 0 ? assistantContent.toString() : message.getString("message");
                metadataCollector.recordGeneratedError(message);
                aiSdkConversationService.saveAssistantMessage(conversationId, failedContent, "failed", app, request, metadataCollector.toMetadata());
            } catch (IOException ignored) {
            }
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private void triggerContextCompactionIfNeeded(AiragApp app, AppDebugParams request, String conversationId, String currentMessageId, Map<String, Object> userContext) {
        try {
            if (!aiSdkConversationService.shouldCompactContext(conversationId, currentMessageId)) {
                return;
            }
            Map<String, Object> compactionSource = aiSdkConversationService.buildCompactionSource(conversationId, currentMessageId);
            List<?> messages = (List<?>) compactionSource.get("messages");
            if (messages == null || messages.isEmpty()) {
                return;
            }
            JSONObject payload = new JSONObject();
            payload.put("app", buildAppPayload(app));
            payload.put("conversation_id", conversationId);
            payload.put("context_source", compactionSource);
            payload.put("user_context", userContext == null ? new JSONObject() : userContext);

            HttpURLConnection compactConnection = null;
            try {
                compactConnection = openJsonConnection("/api/context/compact");
                try (OutputStream outputStream = compactConnection.getOutputStream()) {
                    outputStream.write(payload.toJSONString().getBytes(StandardCharsets.UTF_8));
                }
                int status = compactConnection.getResponseCode();
                if (status < 200 || status >= 300) {
                    throw new IOException("ai-orchestrator HTTP " + status + readErrorBody(compactConnection));
                }
                JSONObject response = JSONObject.parseObject(readBody(compactConnection.getInputStream()));
                String summaryText = response.getString("summaryText");
                if (summaryText == null) {
                    summaryText = response.getString("summary_text");
                }
                if (summaryText == null || summaryText.trim().isEmpty()) {
                    log.warn("上下文压缩未返回摘要内容，conversationId={}", conversationId);
                    return;
                }
                String summaryMessageId = response.getString("summaryMessageId");
                if (summaryMessageId == null) {
                    summaryMessageId = response.getString("summary_message_id");
                }
                Integer tokenCount = response.getInteger("tokenCount");
                if (tokenCount == null) {
                    tokenCount = response.getInteger("token_count");
                }
                String activeContextSnapshot = response.getString("activeContextSnapshot");
                if (activeContextSnapshot == null) {
                    activeContextSnapshot = response.getString("active_context_snapshot");
                }
                Integer activeContextTokenCount = response.getInteger("activeContextTokenCount");
                if (activeContextTokenCount == null) {
                    activeContextTokenCount = response.getInteger("active_context_token_count");
                }
                JSONObject tokenLedger = response.getJSONObject("tokenLedger");
                if (tokenLedger == null) {
                    tokenLedger = response.getJSONObject("token_ledger");
                }
                JSONObject metadata = response.getJSONObject("metadata");
                aiSdkConversationService.updateConversationSummary(conversationId, summaryText, summaryMessageId, tokenCount, activeContextSnapshot, activeContextTokenCount, tokenLedger, metadata);
                log.info("上下文压缩完成，conversationId={}, summaryMessageId={}, tokenCount={}, activeContextTokenCount={}", conversationId, summaryMessageId, tokenCount, activeContextTokenCount);
            } finally {
                if (compactConnection != null) {
                    compactConnection.disconnect();
                }
            }
        } catch (Exception e) {
            log.warn("上下文压缩失败，conversationId={}", conversationId, e);
        }
    }

    private void runContextPostProcessing(AiragApp app, AppDebugParams request, String conversationId, String currentMessageId, HttpServletRequest httpRequest) {
        Map<String, Object> userContext = buildUserContext(httpRequest);
        CONTEXT_POST_PROCESSOR.submit(() -> {
            try {
                aiSdkConversationService.embedPendingContextFragments(conversationId);
            } catch (Exception e) {
                log.warn("AI SDK 上下文向量化失败，conversationId={}", conversationId, e);
            }
            triggerContextCompactionIfNeeded(app, request, conversationId, currentMessageId, userContext);
        });
    }

    private void prepareSseResponse(HttpServletResponse response) {
        response.setStatus(HttpServletResponse.SC_OK);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.TEXT_EVENT_STREAM_VALUE + ";charset=UTF-8");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");
        response.setHeader("X-Accel-Buffering", "no");
    }

    private HttpURLConnection openConnection(String path) throws IOException {
        URL url = new URL(trimRightSlash(properties.getBaseUrl()) + path);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("POST");
        connection.setDoOutput(true);
        connection.setConnectTimeout(properties.getTimeout());
        connection.setReadTimeout(properties.getTimeout());
        connection.setRequestProperty("Content-Type", MediaType.APPLICATION_JSON_VALUE);
        connection.setRequestProperty("Accept", MediaType.TEXT_EVENT_STREAM_VALUE);
        return connection;
    }

    private HttpURLConnection openJsonConnection(String path) throws IOException {
        URL url = new URL(trimRightSlash(properties.getBaseUrl()) + path);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("POST");
        connection.setDoOutput(true);
        connection.setConnectTimeout(properties.getTimeout());
        connection.setReadTimeout(properties.getTimeout());
        connection.setRequestProperty("Content-Type", MediaType.APPLICATION_JSON_VALUE);
        connection.setRequestProperty("Accept", MediaType.APPLICATION_JSON_VALUE);
        return connection;
    }

    private HttpURLConnection openGetConnection(String path) throws IOException {
        URL url = new URL(trimRightSlash(properties.getBaseUrl()) + path);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("GET");
        connection.setConnectTimeout(properties.getTimeout());
        connection.setReadTimeout(properties.getTimeout());
        connection.setRequestProperty("Accept", MediaType.APPLICATION_JSON_VALUE);
        return connection;
    }

    private JSONObject buildChatPayload(AiragApp app, AppDebugParams request, HttpServletRequest httpRequest, Map<String, Object> contextSource) {
        JSONObject payload = new JSONObject();
        payload.put("app", buildAppPayload(app));
        payload.put("input", request.getContent());
        payload.put("conversation_id", request.getConversationId());
        payload.put("topic_id", request.getTopicId());
        payload.put("enable_search", Boolean.TRUE.equals(request.getEnableSearch()));
        payload.put("skill_ids", request.getSkillIds());
        payload.put("attachments", request.getAttachments());
        payload.put("context_source", contextSource);
        payload.put("user_context", buildUserContext(httpRequest));
        return payload;
    }

    private ForwardedEvent forwardEvent(PrintWriter writer, String rawEvent) {
        if (rawEvent == null || rawEvent.trim().isEmpty()) {
            return new ForwardedEvent(false, null);
        }
        for (String line : rawEvent.split("\\n")) {
            if (line.startsWith("data:") && !line.substring(5).trim().isEmpty()) {
                writer.write(rawEvent);
                writer.write("\n");
                writer.flush();
                return new ForwardedEvent(true, parseEventData(line.substring(5).trim()));
            }
        }
        return new ForwardedEvent(false, null);
    }

    private boolean handleForwardedEvent(JSONObject eventData, StringBuilder assistantContent, boolean assistantSaved, String conversationId, AiragApp app, AppDebugParams request, AssistantSseMetadataCollector metadataCollector) {
        if (eventData == null || assistantSaved) {
            return assistantSaved;
        }
        metadataCollector.record(eventData);
        String event = eventData.getString("event");
        if ("MESSAGE".equals(event)) {
            JSONObject data = eventData.getJSONObject("data");
            String message = data == null ? null : data.getString("message");
            if (message != null) {
                assistantContent.append(message);
            }
            return false;
        }
        if ("MESSAGE_END".equals(event)) {
            aiSdkConversationService.saveAssistantMessage(conversationId, assistantContent.toString(), "completed", app, request, metadataCollector.toMetadata());
            return true;
        }
        if ("ERROR".equals(event)) {
            JSONObject data = eventData.getJSONObject("data");
            String message = data == null ? null : data.getString("message");
            String content = assistantContent.length() > 0 ? assistantContent.toString() : message;
            aiSdkConversationService.saveAssistantMessage(conversationId, content, "failed", app, request, metadataCollector.toMetadata());
            return true;
        }
        return false;
    }

    private JSONObject parseEventData(String data) {
        try {
            return JSONObject.parseObject(data);
        } catch (Exception e) {
            log.warn("解析 ai-orchestrator SSE 事件失败: {}", data, e);
            return null;
        }
    }

    private static class ForwardedEvent {
        private final boolean forwarded;
        private final JSONObject eventData;

        private ForwardedEvent(boolean forwarded, JSONObject eventData) {
            this.forwarded = forwarded;
            this.eventData = eventData;
        }
    }

    private static class AssistantSseMetadataCollector {
        private final List<JSONObject> toolCalls = new ArrayList<>();
        private final List<JSONObject> toolResults = new ArrayList<>();
        private final List<JSONObject> sources = new ArrayList<>();
        private final List<JSONObject> skillEvents = new ArrayList<>();
        private final List<JSONObject> contextEvents = new ArrayList<>();
        private final List<JSONObject> errors = new ArrayList<>();
        private final Set<String> sourceKeys = new HashSet<>();
        private final JSONObject model = new JSONObject();
        private final JSONObject params = new JSONObject();
        private final List<Map<String, Object>> attachments;

        private AssistantSseMetadataCollector(AiragApp app, AppDebugParams request) {
            this.attachments = request.getAttachments();
            model.put("appId", app.getId());
            model.put("appName", app.getName());
            model.put("appType", app.getType());
            model.put("modelId", app.getModelId());
            params.put("topicId", request.getTopicId());
            params.put("sessionType", request.getSessionType());
            params.put("enableSearch", Boolean.TRUE.equals(request.getEnableSearch()));
            params.put("skillIds", request.getSkillIds());
        }

        private void record(JSONObject eventData) {
            String event = eventData.getString("event");
            JSONObject data = eventData.getJSONObject("data");
            if ("TOOL_CALL".equals(event)) {
                addEventPayload(toolCalls, eventData, data);
                return;
            }
            if ("TOOL_RESULT".equals(event)) {
                addEventPayload(toolResults, eventData, data);
                collectSources(data);
                return;
            }
            if ("SKILL_SELECTED".equals(event) || "SPEC_EVENT".equals(event)) {
                addEventPayload(skillEvents, eventData, data);
                return;
            }
            if ("CONTEXT_SELECTED".equals(event)) {
                addEventPayload(contextEvents, eventData, data);
                return;
            }
            if ("ERROR".equals(event)) {
                addEventPayload(errors, eventData, data);
            }
        }

        private void recordGeneratedError(JSONObject data) {
            JSONObject event = new JSONObject();
            event.put("event", "ERROR");
            event.put("data", data);
            addEventPayload(errors, event, data);
        }

        private Map<String, Object> toMetadata() {
            JSONObject metadata = new JSONObject();
            metadata.put("toolCalls", toolCalls);
            metadata.put("toolResults", toolResults);
            metadata.put("sources", sources);
            metadata.put("skillEvents", skillEvents);
            metadata.put("contextEvents", contextEvents);
            metadata.put("attachments", attachments == null ? new ArrayList<>() : attachments);
            metadata.put("model", model);
            metadata.put("params", params);
            if (!errors.isEmpty()) {
                metadata.put("errors", errors);
            }
            return metadata;
        }

        private void addEventPayload(List<JSONObject> target, JSONObject eventData, JSONObject data) {
            JSONObject payload = data == null ? new JSONObject() : new JSONObject(data);
            payload.put("event", eventData.getString("event"));
            payload.put("requestId", eventData.getString("requestId"));
            payload.put("conversationId", eventData.getString("conversationId"));
            payload.put("topicId", eventData.getString("topicId"));
            target.add(payload);
        }

        private void collectSources(JSONObject data) {
            if (data == null || !"web_search".equals(data.getString("toolName"))) {
                return;
            }
            JSONObject result = data.getJSONObject("result");
            if (result == null || result.getJSONArray("results") == null) {
                return;
            }
            for (Object item : result.getJSONArray("results")) {
                if (!(item instanceof JSONObject source)) {
                    continue;
                }
                String url = source.getString("url");
                String key = url == null || url.isEmpty() ? source.toJSONString() : url;
                if (sourceKeys.add(key)) {
                    sources.add(source);
                }
            }
        }
    }

    private JSONObject buildEvent(String requestId, String event, JSONObject data, String conversationId, String topicId) {
        JSONObject eventData = new JSONObject();
        eventData.put("requestId", requestId);
        eventData.put("event", event);
        eventData.put("data", data);
        eventData.put("conversationId", conversationId);
        eventData.put("topicId", topicId);
        return eventData;
    }

    private void sendEvent(PrintWriter writer, JSONObject eventData) {
        writer.write("data:");
        writer.write(eventData.toJSONString());
        writer.write("\n\n");
        writer.flush();
    }

    private boolean isClientAbortException(Exception e) {
        Throwable current = e;
        while (current != null) {
            String className = current.getClass().getName();
            String message = current.getMessage();
            if (className.contains("ClientAbortException")) {
                return true;
            }
            if (message != null && (message.contains("Broken pipe") || message.contains("Connection reset by peer"))) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private String readErrorBody(HttpURLConnection connection) {
        InputStream errorStream = connection.getErrorStream();
        if (errorStream == null) {
            return "";
        }
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(errorStream, StandardCharsets.UTF_8))) {
            StringBuilder body = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                body.append(line);
            }
            return body.length() > 0 ? "：" + body : "";
        } catch (IOException e) {
            return "";
        }
    }

    private String readBody(InputStream inputStream) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            StringBuilder body = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                body.append(line);
            }
            return body.toString();
        }
    }

    private JSONObject buildAppPayload(AiragApp app) {
        JSONObject appPayload = new JSONObject();
        appPayload.put("id", app.getId());
        appPayload.put("name", app.getName());
        appPayload.put("type", app.getType());
        appPayload.put("descr", app.getDescr());
        appPayload.put("prompt", app.getPrompt());
        appPayload.put("model_id", app.getModelId());
        appPayload.put("knowledge_ids", app.getKnowledgeIds());
        appPayload.put("flow_id", app.getFlowId());
        appPayload.put("plugins", app.getPlugins());
        appPayload.put("metadata", app.getMetadata());
        return appPayload;
    }

    private JSONObject buildUserContext(HttpServletRequest request) {
        JSONObject userContext = new JSONObject();
        LoginUser loginUser = getLoginUser();
        if (loginUser != null) {
            userContext.put("user_id", loginUser.getId());
            userContext.put("username", loginUser.getUsername());
        }
        userContext.put("tenant_id", TokenUtils.getTenantIdByRequest(request));
        userContext.put("token", TokenUtils.getTokenByRequest(request));
        return userContext;
    }

    private LoginUser getLoginUser() {
        try {
            Object principal = SecurityUtils.getSubject().getPrincipal();
            return principal instanceof LoginUser ? (LoginUser) principal : null;
        } catch (Exception e) {
            log.debug("获取登录用户失败", e);
            return null;
        }
    }

    private String trimRightSlash(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
