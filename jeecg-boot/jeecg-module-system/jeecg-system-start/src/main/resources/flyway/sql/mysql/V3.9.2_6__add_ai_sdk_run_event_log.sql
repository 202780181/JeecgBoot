CREATE TABLE IF NOT EXISTS `airag_ai_sdk_run` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `conversation_id` varchar(64) NOT NULL COMMENT '会话ID',
  `user_message_id` varchar(64) DEFAULT NULL COMMENT '用户消息ID',
  `assistant_message_id` varchar(64) DEFAULT NULL COMMENT '助手消息ID',
  `status` varchar(32) NOT NULL COMMENT '状态:running/completed/failed/cancelled',
  `started_at` datetime DEFAULT NULL COMMENT '开始时间',
  `ended_at` datetime DEFAULT NULL COMMENT '结束时间',
  `error_message` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '错误信息',
  `metadata_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '元数据JSON',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_airag_ai_sdk_run_conv_time` (`conversation_id`, `create_time`),
  KEY `idx_airag_ai_sdk_run_user_msg` (`user_message_id`),
  KEY `idx_airag_ai_sdk_run_assistant_msg` (`assistant_message_id`),
  KEY `idx_airag_ai_sdk_run_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI SDK Agent Run';

CREATE TABLE IF NOT EXISTS `airag_ai_sdk_run_event` (
  `id` varchar(64) NOT NULL COMMENT '主键',
  `run_id` varchar(64) NOT NULL COMMENT 'Run ID',
  `conversation_id` varchar(64) NOT NULL COMMENT '会话ID',
  `sequence` int NOT NULL COMMENT '事件序号',
  `event_type` varchar(64) NOT NULL COMMENT '事件类型',
  `phase` varchar(64) NOT NULL COMMENT '执行阶段',
  `status` varchar(32) NOT NULL COMMENT '事件状态',
  `payload_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '事件完整JSON',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_airag_ai_sdk_run_event_seq` (`run_id`, `sequence`),
  KEY `idx_airag_ai_sdk_run_event_conv_time` (`conversation_id`, `create_time`),
  KEY `idx_airag_ai_sdk_run_event_type` (`event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI SDK Agent Run Event Log';
