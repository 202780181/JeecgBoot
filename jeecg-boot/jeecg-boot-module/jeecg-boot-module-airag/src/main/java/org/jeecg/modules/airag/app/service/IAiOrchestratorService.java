package org.jeecg.modules.airag.app.service;

import jakarta.servlet.http.HttpServletRequest;
import org.jeecg.modules.airag.app.vo.AppDebugParams;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

public interface IAiOrchestratorService {
    SseEmitter debug(AppDebugParams request, HttpServletRequest httpRequest);
}
