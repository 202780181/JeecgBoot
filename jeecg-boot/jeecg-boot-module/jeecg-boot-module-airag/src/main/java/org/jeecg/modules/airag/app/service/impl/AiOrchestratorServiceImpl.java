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
import org.jeecg.modules.airag.app.entity.AiragApp;
import org.jeecg.modules.airag.app.service.IAiOrchestratorService;
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
import java.util.UUID;

@Slf4j
@Service
public class AiOrchestratorServiceImpl implements IAiOrchestratorService {
    @Autowired
    private IAiragAppService airagAppService;

    @Autowired
    private AiOrchestratorProperties properties;

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
        if (app == null) {
            throw new JeecgBootException("AI应用配置不能为空");
        }
        return app;
    }

    private void proxyChatStream(AiragApp app, AppDebugParams request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String requestId = UUID.randomUUID().toString();
        String conversationId = request.getConversationId() == null ? "debug" : request.getConversationId();
        String topicId = request.getTopicId() == null ? "" : request.getTopicId();
        HttpURLConnection connection = null;
        boolean forwarded = false;
        prepareSseResponse(httpResponse);
        try {
            connection = openConnection("/api/apps/chat/stream");
            try (OutputStream outputStream = connection.getOutputStream()) {
                outputStream.write(buildChatPayload(app, request, httpRequest).toJSONString().getBytes(StandardCharsets.UTF_8));
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
                        forwarded = forwardEvent(writer, event.toString()) || forwarded;
                        event.setLength(0);
                    } else {
                        event.append(line).append('\n');
                    }
                }
                forwarded = forwardEvent(writer, event.toString()) || forwarded;
            }
            if (!forwarded) {
                JSONObject message = new JSONObject();
                message.put("message", "ai-orchestrator 没有返回有效 SSE 事件");
                sendEvent(writer, buildEvent(requestId, "ERROR", message, conversationId, topicId));
            }
        } catch (Exception e) {
            log.error("ai-orchestrator SSE 代理失败", e);
            try {
                JSONObject message = new JSONObject();
                message.put("message", "ai-orchestrator 调用失败：" + e.getMessage());
                sendEvent(httpResponse.getWriter(), buildEvent(requestId, "ERROR", message, conversationId, topicId));
            } catch (IOException ignored) {
            }
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
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

    private HttpURLConnection openGetConnection(String path) throws IOException {
        URL url = new URL(trimRightSlash(properties.getBaseUrl()) + path);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("GET");
        connection.setConnectTimeout(properties.getTimeout());
        connection.setReadTimeout(properties.getTimeout());
        connection.setRequestProperty("Accept", MediaType.APPLICATION_JSON_VALUE);
        return connection;
    }

    private JSONObject buildChatPayload(AiragApp app, AppDebugParams request, HttpServletRequest httpRequest) {
        JSONObject payload = new JSONObject();
        payload.put("app", buildAppPayload(app));
        payload.put("input", request.getContent());
        payload.put("conversation_id", request.getConversationId());
        payload.put("topic_id", request.getTopicId());
        payload.put("enable_search", Boolean.TRUE.equals(request.getEnableSearch()));
        payload.put("skill_ids", request.getSkillIds());
        payload.put("messages", request.getMessages());
        payload.put("user_context", buildUserContext(httpRequest));
        return payload;
    }

    private boolean forwardEvent(PrintWriter writer, String rawEvent) {
        if (rawEvent == null || rawEvent.trim().isEmpty()) {
            return false;
        }
        for (String line : rawEvent.split("\\n")) {
            if (line.startsWith("data:") && !line.substring(5).trim().isEmpty()) {
                writer.write(rawEvent);
                writer.write("\n");
                writer.flush();
                return true;
            }
        }
        return false;
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
