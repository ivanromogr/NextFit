package com.tuap.backend.auth;

public enum ClientType {
    WEB, MOBILE;

    public static ClientType fromHeader(String value) {
        if (value == null || value.isBlank()) return WEB;
        try { return valueOf(value.trim().toUpperCase(java.util.Locale.ROOT)); }
        catch (IllegalArgumentException exception) { throw new InvalidClientTypeException(); }
    }
}
