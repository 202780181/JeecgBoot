INSERT INTO `sys_permission` (
  `id`, `parent_id`, `name`, `url`, `component`, `is_route`, `component_name`, `redirect`,
  `menu_type`, `perms`, `perms_type`, `sort_no`, `always_show`, `icon`,
  `is_leaf`, `keep_alive`, `hidden`, `hide_tab`, `description`, `create_by`,
  `create_time`, `update_by`, `update_time`, `del_flag`, `rule_flag`, `status`, `internal_or_external`
)
SELECT
  '2059400000000000001', '1892553163993931777', 'AI应用开发', '/super/airag/aisdk/AiSdkChat',
  'super/airag/aisdk/AiSdkChat', 1, NULL, NULL, 1, NULL, '0', 6.00, 0,
  'ant-design:message-outlined', 1, 0, 0, 0, NULL, 'admin', NOW(), NULL, NULL, 0, 0, '1', 0
WHERE NOT EXISTS (
  SELECT 1 FROM `sys_permission` WHERE `id` = '2059400000000000001'
);

UPDATE `sys_permission`
SET `name` = 'AI应用开发'
WHERE `id` = '2059400000000000001';

INSERT INTO `sys_role_permission` (`id`, `role_id`, `permission_id`, `data_rule_ids`, `operate_date`, `operate_ip`)
SELECT REPLACE(UUID(), '-', ''), 'f6817f48af4fb3af11b9e8bf182f618b', '2059400000000000001', NULL, NOW(), '127.0.0.1'
WHERE NOT EXISTS (
  SELECT 1 FROM `sys_role_permission`
  WHERE `role_id` = 'f6817f48af4fb3af11b9e8bf182f618b'
    AND `permission_id` = '2059400000000000001'
);
