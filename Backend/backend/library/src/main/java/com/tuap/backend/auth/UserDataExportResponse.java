package com.tuap.backend.auth;
import java.time.Instant; import java.util.List; import java.util.Map;
public record UserDataExportResponse(Instant generatedAt, String accountType, Map<String,Object> profile, Map<String,Object> relationships, List<?> messages, List<?> reviews, List<?> uploads, List<?> consents) { }
