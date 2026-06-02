package org.jeecg.modules.airag.app.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * AI SDK 消息视图
 */
@Data
public class AiSdkMessageVo {
    private String id;
    private String conversationId;
    private String role;
    private String content;
    private String status;
    private String modelId;
    private List<String> skillIds;
    private Map<String, Object> metadata;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    private Date createTime;
}
