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
 * AI SDK 会话
 */
@Data
@TableName("airag_ai_sdk_conversation")
@Accessors(chain = true)
@EqualsAndHashCode(callSuper = false)
@Schema(description = "AI SDK 会话")
public class AiSdkConversation implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.ASSIGN_ID)
    @Schema(description = "主键")
    private String id;

    @Schema(description = "用户ID")
    private String userId;

    @Schema(description = "用户名")
    private String username;

    @Schema(description = "租户ID")
    private String tenantId;

    @Schema(description = "会话类型")
    private String sessionType;

    @Schema(description = "标题")
    private String title;

    @Schema(description = "应用ID")
    private String appId;

    @Schema(description = "应用名称")
    private String appName;

    @Schema(description = "模型ID")
    private String modelId;

    @Schema(description = "摘要")
    private String summary;

    @Schema(description = "摘要截止消息ID")
    private String summaryMessageId;

    @Schema(description = "摘要Token数")
    private Integer summaryTokenCount;

    @Schema(description = "上下文版本")
    private Integer contextVersion;

    @Schema(description = "活跃上下文快照")
    private String activeContextSnapshot;

    @Schema(description = "活跃上下文Token数")
    private Integer activeContextTokenCount;

    @Schema(description = "最近模型输入Token数")
    private Integer lastModelInputTokens;

    @Schema(description = "最近模型输出Token数")
    private Integer lastModelOutputTokens;

    @Schema(description = "最近模型总Token数")
    private Integer lastModelTotalTokens;

    @Schema(description = "估算新增Token数")
    private Integer estimatedAddedTokens;

    @Schema(description = "上下文窗口")
    private Integer contextWindow;

    @Schema(description = "压缩阈值Token数")
    private Integer compactThresholdTokens;

    @Schema(description = "元数据JSON")
    private String metadataJson;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Schema(description = "创建时间")
    private Date createTime;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Schema(description = "更新时间")
    private Date updateTime;
}
