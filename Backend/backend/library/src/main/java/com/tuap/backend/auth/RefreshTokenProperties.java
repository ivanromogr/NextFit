package com.tuap.backend.auth;

public class RefreshTokenProperties {
    private long ttlDays = 30;
    private String cookieName = "nextfit_refresh";
    private String cookiePath = "/api/auth";
    private boolean cookieSecure = true;
    private String cookieSameSite = "Strict";
    public long getTtlDays() { return ttlDays; }
    public void setTtlDays(long ttlDays) { this.ttlDays = ttlDays; }
    public String getCookieName() { return cookieName; }
    public void setCookieName(String cookieName) { this.cookieName = cookieName; }
    public String getCookiePath() { return cookiePath; }
    public void setCookiePath(String cookiePath) { this.cookiePath = cookiePath; }
    public boolean isCookieSecure() { return cookieSecure; }
    public void setCookieSecure(boolean cookieSecure) { this.cookieSecure = cookieSecure; }
    public String getCookieSameSite() { return cookieSameSite; }
    public void setCookieSameSite(String cookieSameSite) { this.cookieSameSite = cookieSameSite; }
}
