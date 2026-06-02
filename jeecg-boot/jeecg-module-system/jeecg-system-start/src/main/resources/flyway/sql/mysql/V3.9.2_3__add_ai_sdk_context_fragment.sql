CREATE TABLE IF NOT EXISTS `airag_ai_sdk_context_fragment` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `conversation_id` varchar(64) NOT NULL COMMENT '会话ID',
  `message_id` varchar(64) NOT NULL COMMENT '消息ID',
  `type` varchar(64) NOT NULL COMMENT '片段类型',
  `text` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '模型可读片段',
  `token_count` int DEFAULT NULL COMMENT '估算Token数',
  `metadata_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '元数据JSON',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_airag_ai_sdk_fragment_conv_time` (`conversation_id`, `create_time`),
  KEY `idx_airag_ai_sdk_fragment_msg` (`message_id`),
  KEY `idx_airag_ai_sdk_fragment_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI SDK 上下文片段';
