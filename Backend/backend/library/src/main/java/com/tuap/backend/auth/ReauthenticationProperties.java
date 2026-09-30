package com.tuap.backend.auth;
import org.springframework.boot.context.properties.ConfigurationProperties; import org.springframework.stereotype.Component;
@Component @ConfigurationProperties(prefix="app.auth.reauth") public class ReauthenticationProperties { private long ttlMinutes=5; public long getTtlMinutes(){return ttlMinutes;} public void setTtlMinutes(long value){ttlMinutes=value;} }
