package com.tuap.backend.auth;

/** The provider credential is the only client input accepted for a Google link. */
public record GoogleIdentityLinkRequest(String credential) { }
