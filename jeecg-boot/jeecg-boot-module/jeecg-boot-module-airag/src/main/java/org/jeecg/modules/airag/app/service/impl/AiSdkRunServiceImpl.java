package org.jeecg.modules.airag.app.service.impl;

import com.alibaba.fastjson.JSONObject;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.jeecg.common.util.UUIDGenerator;
import org.jeecg.modules.airag.app.entity.AiSdkRun;
import org.jeecg.modules.airag.app.entity.AiSdkRunEvent;
import org.jeecg.modules.airag.app.mapper.AiSdkRunEventMapper;
import org.jeecg.modules.airag.app.mapper.AiSdkRunMapper;
import org.jeecg.modules.airag.app.service.IAiSdkRunService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.Map;

/**
 * AI SDK Agent Run 服务实现
 */
@Service
public class AiSdkRunServiceImpl extends ServiceImpl<AiSdkRunMapper, AiSdkRun> implements IAiSdkRunService {

    public static final String STATUS_RUNNING = "running";
    public static final String STATUS_COMPLETED = "completed";
    public static final String STATUS_FAILED = "failed";
    public static final String STATUS_CANCELLED = "cancelled";

    @Autowired
    private AiSdkRunEventMapper aiSdkRunEventMapper;

    @Override
    public AiSdkRun createRun(String runId, String conversationId, String userMessageId, Map<String, Object> metadata) {
        Date now = new Date();
        AiSdkRun run = new AiSdkRun()
                .setId(runId)
                .setConversationId(conversationId)
                .setUserMessageId(userMessageId)
                .setStatus(STATUS_RUNNING)
                .setStartedAt(now)
                .setMetadataJson(metadata == null || metadata.isEmpty() ? null : JSONObject.toJSONString(metadata))
                .setCreateTime(now);
        save(run);
        return run;
    }

    @Override
    public void recordEvent(String runId, String conversationId, JSONObject eventData) {
        AiSdkRunEvent event = new AiSdkRunEvent()
                .setId(UUIDGenerator.generate())
                .setRunId(runId)
                .setConversationId(conversationId)
                .setSequence(eventData.getInteger("sequence"))
                .setEventType(eventData.getString("event"))
                .setPhase(eventData.getString("phase"))
                .setStatus(eventData.getString("status"))
                .setPayloadJson(eventData.toJSONString())
                .setCreateTime(new Date());
        aiSdkRunEventMapper.insert(event);
    }

    @Override
    public void completeRun(String runId, String assistantMessageId) {
        updateRun(runId, STATUS_COMPLETED, assistantMessageId, null);
    }

    @Override
    public void failRun(String runId, String assistantMessageId, String errorMessage) {
        updateRun(runId, STATUS_FAILED, assistantMessageId, errorMessage);
    }

    @Override
    public void cancelRun(String runId, String assistantMessageId, String errorMessage) {
        updateRun(runId, STATUS_CANCELLED, assistantMessageId, errorMessage);
    }

    private void updateRun(String runId, String status, String assistantMessageId, String errorMessage) {
        AiSdkRun run = new AiSdkRun()
                .setId(runId)
                .setStatus(status)
                .setAssistantMessageId(assistantMessageId)
                .setEndedAt(new Date())
                .setErrorMessage(errorMessage);
        updateById(run);
    }
}
