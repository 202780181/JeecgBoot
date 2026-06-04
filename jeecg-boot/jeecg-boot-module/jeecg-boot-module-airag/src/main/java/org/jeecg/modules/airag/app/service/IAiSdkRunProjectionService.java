package org.jeecg.modules.airag.app.service;

import org.jeecg.modules.airag.app.entity.AiSdkMessage;

/**
 * AI SDK Run 投影服务
 */
public interface IAiSdkRunProjectionService {

    AiSdkMessage projectRun(String runId);
}
