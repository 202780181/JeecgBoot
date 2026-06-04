package org.jeecg.modules.airag.app.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;
import org.springframework.format.annotation.DateTimeFormat;

import java.io.Serializable;
import java.util.Date;

/**
 * AI SDK Agent Run Event Log
 */
@Data
@TableName("airag_ai_sdk_run_event")
@Accessors(chain = true)
@EqualsAndHashCode(callSuper = false)
@Schema(description = "AI SDK Agent Run Event Log")
public class AiSdkRunEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.ASSIGN_ID)
    @Schema(description = "主键")
    private String id;

    @Schema(description = "Run ID")
    private String runId;

    @Schema(description = "会话ID")
    private String conversationId;

    @Schema(description = "事件序号")
    private Integer sequence;

    @Schema(description = "事件类型")
    private String eventType;

    @Schema(description = "执行阶段")
    private String phase;

    @Schema(description = "事件状态")
    private String status;

    @Schema(description = "事件完整JSON")
    private String payloadJson;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Schema(description = "创建时间")
    private Date createTime;
}
