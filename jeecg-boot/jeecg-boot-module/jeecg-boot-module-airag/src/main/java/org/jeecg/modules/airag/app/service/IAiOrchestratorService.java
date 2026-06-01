package org.jeecg.modules.airag.app.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jeecg.modules.airag.app.vo.AppDebugParams;

public interface IAiOrchestratorService {
    void debug(AppDebugParams request, HttpServletRequest httpRequest, HttpServletResponse httpResponse);
    void chatStream(AppDebugParams request, HttpServletRequest httpRequest, HttpServletResponse httpResponse);
    String skills();
}
