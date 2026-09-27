package com.tuap.backend.servicios;
import org.springframework.scheduling.annotation.Scheduled; import org.springframework.stereotype.Component; import com.tuap.backend.config.CleanupProperties;
@Component public class CleanupScheduler { private final CleanupService cleanup; private final CleanupProperties properties; public CleanupScheduler(CleanupService c,CleanupProperties p){cleanup=c;properties=p;} @Scheduled(cron="${app.cleanup.cron:0 15 3 * * *}") public void run(){if(properties.isEnabled())cleanup.cleanupAll();} }
