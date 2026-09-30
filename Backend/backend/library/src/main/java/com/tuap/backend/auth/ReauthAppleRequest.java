package com.tuap.backend.auth; public record ReauthAppleRequest(String identityToken,String nonce,AuthProvider targetProvider) {}
