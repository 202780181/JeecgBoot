package org.jeecg.modules.airag.app.service;

import com.alibaba.fastjson.JSONObject;
import com.baomidou.mybatisplus.extension.service.IService;
import org.jeecg.modules.airag.app.entity.AiSdkRun;

import java.util.Map;

/**
 * AI SDK Agent Run 服务
 */
public interface IAiSdkRunService extends IService<AiSdkRun> {

    AiSdkRun createRun(String runId, String conversationId, String userMessageId, Map<String, Object> metadata);

    void recordEvent(String runId, String conversationId, JSONObject eventData);

    void completeRun(String runId, String assistantMessageId);

    void failRun(String runId, String assistantMessageId, String errorMessage);

    void cancelRun(String runId, String assistantMessageId, String errorMessage);
}
