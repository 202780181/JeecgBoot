package org.jeecg.modules.airag.app.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "jeecg.ai-orchestrator")
public class AiOrchestratorProperties {
    private String baseUrl = "http://127.0.0.1:9100";
    private int timeout = 120000;
}
