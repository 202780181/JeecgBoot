CREATE TABLE IF NOT EXISTS `airag_ai_sdk_conversation` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `user_id` varchar(64) DEFAULT NULL COMMENT '用户ID',
  `username` varchar(100) DEFAULT NULL COMMENT '用户名',
  `tenant_id` varchar(64) DEFAULT NULL COMMENT '租户ID',
  `session_type` varchar(64) DEFAULT NULL COMMENT '会话类型',
  `title` varchar(255) DEFAULT NULL COMMENT '标题',
  `app_id` varchar(64) DEFAULT NULL COMMENT '应用ID',
  `app_name` varchar(255) DEFAULT NULL COMMENT '应用名称',
  `model_id` varchar(64) DEFAULT NULL COMMENT '模型ID',
  `summary` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '结构化摘要',
  `summary_message_id` varchar(64) DEFAULT NULL COMMENT '摘要截止消息ID',
  `summary_token_count` int DEFAULT 0 COMMENT '摘要Token数',
  `metadata_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '元数据JSON',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_airag_ai_sdk_conv_user` (`user_id`, `tenant_id`),
  KEY `idx_airag_ai_sdk_conv_update` (`update_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI SDK 会话';

CREATE TABLE IF NOT EXISTS `airag_ai_sdk_message` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `conversation_id` varchar(64) NOT NULL COMMENT '会话ID',
  `role` varchar(32) NOT NULL COMMENT '角色:user/assistant/system/tool',
  `content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '消息内容',
  `token_count` int DEFAULT NULL COMMENT 'Token数',
  `status` varchar(32) DEFAULT NULL COMMENT '状态',
  `skill_ids_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'Skill ID JSON',
  `model_id` varchar(64) DEFAULT NULL COMMENT '模型ID',
  `metadata_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '元数据JSON',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_airag_ai_sdk_msg_conv_time` (`conversation_id`, `create_time`),
  KEY `idx_airag_ai_sdk_msg_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI SDK 消息';
