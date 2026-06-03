ALTER TABLE `airag_ai_sdk_conversation`
  ADD COLUMN `context_version` int DEFAULT 0 COMMENT '上下文版本' AFTER `summary_token_count`,
  ADD COLUMN `active_context_snapshot` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '活跃上下文快照' AFTER `context_version`,
  ADD COLUMN `active_context_token_count` int DEFAULT 0 COMMENT '活跃上下文Token数' AFTER `active_context_snapshot`,
  ADD COLUMN `last_model_input_tokens` int DEFAULT 0 COMMENT '最近模型输入Token数' AFTER `active_context_token_count`,
  ADD COLUMN `last_model_output_tokens` int DEFAULT 0 COMMENT '最近模型输出Token数' AFTER `last_model_input_tokens`,
  ADD COLUMN `last_model_total_tokens` int DEFAULT 0 COMMENT '最近模型总Token数' AFTER `last_model_output_tokens`,
  ADD COLUMN `estimated_added_tokens` int DEFAULT 0 COMMENT '估算新增Token数' AFTER `last_model_total_tokens`,
  ADD COLUMN `context_window` int DEFAULT 0 COMMENT '上下文窗口' AFTER `estimated_added_tokens`,
  ADD COLUMN `compact_threshold_tokens` int DEFAULT 0 COMMENT '压缩阈值Token数' AFTER `context_window`,
  ADD KEY `idx_airag_ai_sdk_conv_context_version` (`context_version`);
