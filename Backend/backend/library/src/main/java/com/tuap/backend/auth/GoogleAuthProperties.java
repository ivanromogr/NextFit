package com.tuap.backend.auth;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Configuration deliberately contains client identifiers only, never Google credentials. */
@Component
@ConfigurationProperties(prefix = "app.auth.google")
public class GoogleAuthProperties {
    private boolean enabled;
    private List<String> allowedAudiences = List.of();

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public List<String> getAllowedAudiences() {
        return allowedAudiences == null ? List.of() : allowedAudiences.stream()
                .filter(value -> value != null && !value.isBlank()).map(String::trim).toList();
    }
    public void setAllowedAudiences(List<String> allowedAudiences) { this.allowedAudiences = allowedAudiences; }
}
