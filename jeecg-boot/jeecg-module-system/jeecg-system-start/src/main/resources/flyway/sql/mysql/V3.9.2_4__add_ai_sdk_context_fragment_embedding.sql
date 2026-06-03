ALTER TABLE `airag_ai_sdk_context_fragment`
  ADD COLUMN `embedding_model_id` varchar(64) DEFAULT NULL COMMENT '向量模型ID' AFTER `token_count`,
  ADD COLUMN `embedding_status` varchar(32) DEFAULT NULL COMMENT '向量状态' AFTER `embedding_model_id`,
  ADD COLUMN `embedding_error` varchar(1000) DEFAULT NULL COMMENT '向量错误' AFTER `embedding_status`,
  ADD COLUMN `embedding_time` datetime DEFAULT NULL COMMENT '向量时间' AFTER `embedding_error`,
  ADD KEY `idx_airag_ai_sdk_fragment_embedding` (`conversation_id`, `embedding_status`, `create_time`);
