package org.jeecg.modules.airag.app.service;

import com.baomidou.mybatisplus.extension.service.IService;
import jakarta.servlet.http.HttpServletRequest;
import org.jeecg.modules.airag.app.entity.AiSdkConversation;
import org.jeecg.modules.airag.app.entity.AiSdkMessage;
import org.jeecg.modules.airag.app.entity.AiragApp;
import org.jeecg.modules.airag.app.vo.AiSdkConversationCreateParams;
import org.jeecg.modules.airag.app.vo.AiSdkConversationRenameParams;
import org.jeecg.modules.airag.app.vo.AiSdkConversationVo;
import org.jeecg.modules.airag.app.vo.AiSdkMessageVo;
import org.jeecg.modules.airag.app.vo.AppDebugParams;

import java.util.List;
import java.util.Map;

/**
 * AI SDK 会话服务
 */
public interface IAiSdkConversationService extends IService<AiSdkConversation> {

    AiSdkConversation ensureConversation(AiragApp app, AppDebugParams request, HttpServletRequest httpRequest);

    AiSdkMessage saveUserMessage(AiSdkConversation conversation, AiragApp app, AppDebugParams request);

    AiSdkMessage saveAssistantMessage(String conversationId, String content, String status, AiragApp app, AppDebugParams request);

    AiSdkMessage saveAssistantMessage(String conversationId, String content, String status, AiragApp app, AppDebugParams request, Map<String, Object> metadata);

    List<Map<String, Object>> findLatestAttachments(String conversationId, HttpServletRequest httpRequest);

    Map<String, Object> buildContextSource(String conversationId, String currentMessageId, HttpServletRequest httpRequest);

    AiSdkConversationVo createConversation(AiSdkConversationCreateParams params, HttpServletRequest httpRequest);

    List<AiSdkConversationVo> listConversations(String sessionType, HttpServletRequest httpRequest);

    List<AiSdkMessageVo> listMessages(String conversationId, HttpServletRequest httpRequest);

    void renameConversation(String conversationId, AiSdkConversationRenameParams params, HttpServletRequest httpRequest);

    void deleteConversation(String conversationId, HttpServletRequest httpRequest);
}
