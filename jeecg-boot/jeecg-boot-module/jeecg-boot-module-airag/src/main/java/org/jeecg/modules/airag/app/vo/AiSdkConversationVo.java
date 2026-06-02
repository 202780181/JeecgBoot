package org.jeecg.modules.airag.app.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.util.Date;
import java.util.List;

/**
 * AI SDK 会话视图
 */
@Data
public class AiSdkConversationVo {
    private String id;
    private String title;
    private String appId;
    private String appName;
    private String modelId;
    private String sessionType;
    private List<String> skillIds;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    private Date createTime;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    private Date updateTime;
}
