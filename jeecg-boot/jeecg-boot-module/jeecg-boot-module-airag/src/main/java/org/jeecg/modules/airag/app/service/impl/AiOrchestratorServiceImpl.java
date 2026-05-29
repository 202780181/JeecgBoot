package org.jeecg.modules.airag.app.service.impl;

import com.alibaba.fastjson.JSONObject;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.apache.shiro.SecurityUtils;
import org.jeecg.common.exception.JeecgBootException;
import org.jeecg.common.system.vo.LoginUser;
import org.jeecg.common.util.AssertUtils;
import org.jeecg.common.util.RestUtil;
import org.jeecg.common.util.TokenUtils;
import org.jeecg.modules.airag.app.config.AiOrchestratorProperties;
import org.jeecg.modules.airag.app.entity.AiragApp;
import org.jeecg.modules.airag.app.service.IAiOrchestratorService;
import org.jeecg.modules.airag.app.service.IAiragAppService;
import org.jeecg.modules.airag.app.vo.AppDebugParams;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Service
public class AiOrchestratorServiceImpl implements IAiOrchestratorService {
    @Autowired
    private IAiragAppService airagAppService;

    @Autowired
    private AiOrchestratorProperties properties;

    @Override
    public SseEmitter debug(AppDebugParams request, HttpServletRequest httpRequest) {
        AssertUtils.assertNotEmpty("请输入运行内容", request.getContent());
        AiragApp app = request.getApp();
        if (app == null && request.getAppId() != null) {
            app = airagAppService.getById(request.getAppId());
        }
        if (app == null) {
            throw new JeecgBootException("AI应用配置不能为空");
        }

        SseEmitter emitter = new SseEmitter(0L);
        String requestId = UUID.randomUUID().toString();
        String conversationId = request.getConversationId() == null ? "debug" : request.getConversationId();
        String topicId = request.getTopicId() == null ? "" : request.getTopicId();
        AiragApp finalApp = app;
        new Thread(() -> {
            try {
                JSONObject body = callDebug(finalApp, request.getContent(), true, httpRequest);
                sendEvent(emitter, buildEvent(requestId, "INIT_REQUEST_ID", null, conversationId, topicId));
                JSONObject message = new JSONObject();
                message.put("message", body.getString("output"));
                sendEvent(emitter, buildEvent(requestId, "MESSAGE", message, conversationId, topicId));
                sendEvent(emitter, buildEvent(requestId, "MESSAGE_END", null, conversationId, topicId));
                emitter.complete();
            } catch (Exception e) {
                log.error("ai-orchestrator 调试失败", e);
                try {
                    JSONObject message = new JSONObject();
                    message.put("message", "ai-orchestrator 调试失败：" + e.getMessage());
                    sendEvent(emitter, buildEvent(requestId, "ERROR", message, conversationId, topicId));
                } catch (IOException ignored) {
                } finally {
                    emitter.complete();
                }
            }
        }, "ai-orchestrator-debug").start();
        return emitter;
    }

    private JSONObject callDebug(AiragApp app, String input, boolean dryRun, HttpServletRequest httpRequest) {
        JSONObject payload = new JSONObject();
        payload.put("app", buildAppPayload(app));
        payload.put("input", input);
        payload.put("dry_run", dryRun);
        payload.put("user_context", buildUserContext(httpRequest));

        String url = trimRightSlash(properties.getBaseUrl()) + "/api/apps/debug";
        HttpHeaders headers = RestUtil.getHeaderApplicationJson();
        ResponseEntity<JSONObject> response = RestUtil.request(url, HttpMethod.POST, headers, null, payload, JSONObject.class, properties.getTimeout());
        return response.getBody();
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

    private void sendEvent(SseEmitter emitter, JSONObject eventData) throws IOException {
        emitter.send(SseEmitter.event().data(eventData.toJSONString()));
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
