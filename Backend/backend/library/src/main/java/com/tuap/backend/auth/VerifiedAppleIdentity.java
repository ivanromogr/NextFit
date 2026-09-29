package com.tuap.backend.auth;
public record VerifiedAppleIdentity(String subject,String email,boolean emailVerified,boolean privateEmail,String nonce) {public VerifiedAppleIdentity{if(subject==null||subject.isBlank())throw new InvalidAppleTokenException();}}
