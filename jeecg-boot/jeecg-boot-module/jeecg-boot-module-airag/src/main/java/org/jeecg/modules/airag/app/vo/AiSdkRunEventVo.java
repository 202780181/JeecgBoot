package org.jeecg.modules.airag.app.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.util.Date;
import java.util.Map;

/**
 * AI SDK Run 事件视图
 */
@Data
public class AiSdkRunEventVo {
    private String id;
    private String runId;
    private String conversationId;
    private Integer sequence;
    private String eventType;
    private String phase;
    private String status;
    private Map<String, Object> payload;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    private Date createTime;
}
