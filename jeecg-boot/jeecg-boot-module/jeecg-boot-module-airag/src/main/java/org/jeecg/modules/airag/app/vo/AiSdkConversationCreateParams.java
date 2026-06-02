package org.jeecg.modules.airag.app.vo;

import lombok.Data;

import java.util.List;

/**
 * AI SDK 新建会话参数
 */
@Data
public class AiSdkConversationCreateParams {
    private String title;
    private String appId;
    private String appName;
    private String modelId;
    private String sessionType;
    private List<String> skillIds;
}
