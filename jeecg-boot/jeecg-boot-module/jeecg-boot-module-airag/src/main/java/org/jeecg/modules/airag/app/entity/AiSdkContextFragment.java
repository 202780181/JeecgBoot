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
 * AI SDK 上下文片段
 */
@Data
@TableName("airag_ai_sdk_context_fragment")
@Accessors(chain = true)
@EqualsAndHashCode(callSuper = false)
@Schema(description = "AI SDK 上下文片段")
public class AiSdkContextFragment implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.ASSIGN_ID)
    @Schema(description = "主键")
    private String id;

    @Schema(description = "会话ID")
    private String conversationId;

    @Schema(description = "消息ID")
    private String messageId;

    @Schema(description = "片段类型")
    private String type;

    @Schema(description = "模型可读片段")
    private String text;

    @Schema(description = "估算Token数")
    private Integer tokenCount;

    @Schema(description = "元数据JSON")
    private String metadataJson;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Schema(description = "创建时间")
    private Date createTime;
}
