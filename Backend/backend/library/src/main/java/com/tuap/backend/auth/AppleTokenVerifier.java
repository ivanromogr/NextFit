package com.tuap.backend.auth; public interface AppleTokenVerifier { VerifiedAppleIdentity verify(String identityToken,String expectedNonce); }
